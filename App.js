import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Button,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import MapView, { Marker } from 'react-native-maps';
import * as MediaLibrary from 'expo-media-library';
import * as Calendar from 'expo-calendar';

const FLASK_API_URL = 'https://reactappdb.onrender.com';


function HomeScreen({ navigation }) {
  const [meetingsAttended] = useState(12);
  const [goal] = useState(30);

  // We'll store upcoming meetings fetched from Flask
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  // Optionally track errors
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUpcomingMeetings = async () => {
      try {
        setError(null); // reset any previous error
        const response = await fetch(`${FLASK_API_URL}/meetings`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();

        
        const now = new Date();
        const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

        const filtered = data.filter((m) => {
          if (!m.start_time) return false; // if no start_time, skip
          const st = new Date(m.start_time);
          // "upcoming" means st is after now AND before or at +2 days
          return st > now && st <= twoDaysFromNow;
        });

        setUpcomingMeetings(filtered);
      } catch (err) {
        console.error('Error fetching upcoming meetings:', err);
        setError(err.message);
        setUpcomingMeetings([]);
      }
    };

    fetchUpcomingMeetings();
  }, []);

  // Calculate progress for the progress bar
  const progress = goal > 0 ? meetingsAttended / goal : 0;
  const progressPercent = `${Math.min(progress * 100, 100)}%`;

  // Render each upcoming meeting item
  const renderUpcomingMeeting = ({ item }) => (
    <View style={styles.upcomingMeetingItem}>
      <Text style={styles.upcomingMeetingText}>{item.title}</Text>
      {/* Optional: Show the start time or date */}
      {item.start_time && (
        <Text style={styles.upcomingMeetingText}>
          Starts: {new Date(item.start_time).toLocaleString()}
        </Text>
      )}
    </View>
  );

  
  const renderHeader = () => (
    <>
      {/* Top row with Meetings Attended & Goal */}
      <View style={styles.topRowContainer}>
        <View style={styles.meetingsBox}>
          <Text style={styles.meetingsBoxText}>
            Meetings Attended: {meetingsAttended}
          </Text>
        </View>

        <View style={styles.goalBox}>
          <Text style={styles.goalBoxText}>Goal: {goal}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: progressPercent }]} />
        </View>
        <Text style={styles.progressText}>
          {Math.round(progress * 100)}% Complete
        </Text>
      </View>

      {/* Button row: Check In (left), Find Meeting (right) */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.homeButton, { marginRight: 10 }]}
          onPress={() => navigation.navigate('Check-In')}
        >
          <Text style={styles.homeButtonText}>Check In (Take Selfie)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.homeButton, { marginLeft: 10 }]}
          onPress={() => navigation.navigate('Meeting Finder')}
        >
          <Text style={styles.homeButtonText}>Find Meeting</Text>
        </TouchableOpacity>
      </View>

      {/* Label for Upcoming Meetings */}
      <Text style={styles.upcomingTitle}>Upcoming Meetings</Text>

      {/* If there's an error or no data, show a message */}
      {error && (
        <Text style={{ color: 'red', marginLeft: 20 }}>
          {error}
        </Text>
      )}
      {(!error && upcomingMeetings.length === 0) && (
        <Text style={{ marginLeft: 20 }}>
          No upcoming meetings found.
        </Text>
      )}
    </>
  );

  return (
    <View style={styles.homeContainer}>
      <FlatList
        data={upcomingMeetings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUpcomingMeeting}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.upcomingListContent}
      />
    </View>
  );
}


function MeetingFinderScreen({ navigation }) {
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState(null);

  // Fetch all meetings from Flask API
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        setError(null);
        const response = await fetch(`${FLASK_API_URL}/meetings`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
          setMeetings([]);
        } else {
          setMeetings(data);
        }
      } catch (err) {
        console.error('Error fetching meetings:', err);
        setError(err.message);
        setMeetings([]);
      }
    };
    fetchMeetings();
  }, []);

  // ------------- Add event to phone's calendar -------------
  const addEventToCalendar = async (meeting) => {
    try {
      // Request permission to access Calendars
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied!', 'Cannot add event to calendar.');
        return;
      }

      // Find or create a calendar to add events. 
      const defaultCalendarId = await getDefaultCalendarId();

      // start_time/end_time from meeting data
      const startTime = meeting.start_time
        ? new Date(meeting.start_time)
        : new Date();
      const endTime = meeting.end_time
        ? new Date(meeting.end_time)
        : new Date(Date.now() + 60 * 60 * 1000); // default 1 hr after start

      const eventDetails = {
        title: meeting.title || 'Meeting',
        notes: meeting.description || '',
        startDate: startTime,
        endDate: endTime,
        timeZone: 'UTC', // I will might need to mod this in case we need diff time zone
        location: `${meeting.latitude}, ${meeting.longitude}`,
      };

      const eventId = await Calendar.createEventAsync(defaultCalendarId, eventDetails);
      Alert.alert('Success', `Event created in calendar (ID: ${eventId})`);
    } catch (err) {
      console.error('Error adding event to calendar:', err);
      Alert.alert('Error', 'Unable to create calendar event');
    }
  };

  // Helper function to find or create a default calendar
  const getDefaultCalendarId = async () => {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    // Try to find a "default" calendar
    const defaultCalendars = calendars.filter(
      (cal) => cal.isPrimary || cal.source?.name === 'Default'
    );
    if (defaultCalendars.length) {
      return defaultCalendars[0].id;
    }
    
    if (calendars.length) {
      return calendars[0].id;
    }
    
    const newCalendarId = await createNewCalendar();
    return newCalendarId;
  };

  
  const createNewCalendar = async () => {
    const defaultCalendarSource =
      Platform.OS === 'ios'
        ? await Calendar.getDefaultCalendarAsync()
        : { isLocalAccount: true, name: 'Expo Calendar' };

    const newCalendar = {
      title: 'My Meetings Calendar',
      color: '#512DA8',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendarSource.id,
      source: defaultCalendarSource,
      name: 'Internal Meetings Calendar',
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    };

    return await Calendar.createCalendarAsync(newCalendar);
  };

  // ------------------------------------------------------

  
  const renderMeetingItem = ({ item }) => (
    <TouchableOpacity style={styles.listItem}>
      <Text style={styles.listItemText}>{item.title}</Text>
      <Text style={styles.listItemSubText}>{item.description}</Text>

      <View style={{ marginVertical: 5 }}>
        <Button
          title="Add to Calendar"
          onPress={() => addEventToCalendar(item)}
        />
      </View>

      <View style={{ marginVertical: 5 }}>
        <Button
          title="Check-In"
          onPress={() => navigation.navigate('Check-In')}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error fetching meetings: {error}</Text>
        </View>
      )}

      {/* Show a map with markers */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.7749,
          longitude: -122.4194,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {meetings.map((meeting) => {
          
          const lat = parseFloat(meeting.latitude);
          const lon = parseFloat(meeting.longitude);

          
          if (isNaN(lat) || isNaN(lon)) {
            console.warn(
              `Skipping marker for meeting ID ${meeting.id} due to invalid coords:`,
              meeting.latitude,
              meeting.longitude
            );
            return null;
          }

          return (
            <Marker
              key={meeting.id}
              coordinate={{ latitude: lat, longitude: lon }}
              title={meeting.title}
              description={meeting.description}
            />
          );
        })}
      </MapView>

      {meetings.length === 0 && !error ? (
        <View style={styles.noMeetingsContainer}>
          <Text style={styles.noMeetingsText}>No meetings found.</Text>
        </View>
      ) : (
        <FlatList
          data={meetings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMeetingItem}
          style={styles.list}
        />
      )}
    </View>
  );
}

/* ------------------------------------------------------
   3) CHECK-IN SCREEN
------------------------------------------------------ */
function CheckInScreen() {
  const openCamera = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      Alert.alert(
        'Camera permission granted!',
        'You can now implement the camera functionality here.'
      );
    } else {
      Alert.alert('Camera permission denied!');
    }
  };

  return (
    <View style={styles.containerCenter}>
      <Text style={styles.header}>Check-In</Text>
      <View style={{ marginVertical: 10 }}>
        <Button title="Open Camera" onPress={openCamera} />
      </View>
      <View style={{ marginVertical: 10 }}>
        <Button
          title="Submit Check-In"
          onPress={() => Alert.alert('Check-In Submitted!')}
        />
      </View>
    </View>
  );
}

/* ------------------------------------------------------
   NAVIGATION SETUP
------------------------------------------------------ */
const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Meeting Finder" component={MeetingFinderScreen} />
        <Stack.Screen name="Check-In" component={CheckInScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/* ------------------------------------------------------
   STYLES
------------------------------------------------------ */
const styles = StyleSheet.create({
  // ---------- HOME SCREEN -----------
  homeContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topRowContainer: {
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  meetingsBox: {
    flex: 2,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginRight: 5,
    justifyContent: 'center',
  },
  goalBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginLeft: 5,
    justifyContent: 'center',
  },
  meetingsBoxText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  goalBoxText: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  // ---------- PROGRESS BAR -----------
  progressBarContainer: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  progressBarBackground: {
    width: '100%',
    height: 20,
    backgroundColor: '#eee',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
  },

  // ---------- BUTTON ROW -----------
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  homeButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
  },

  // ---------- UPCOMING MEETINGS -----------
  upcomingTitle: {
    marginTop: 30,
    marginLeft: 20,
    fontSize: 18,
    fontWeight: 'bold',
  },
  upcomingListContent: {
    paddingBottom: 20,
  },
  upcomingMeetingItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  upcomingMeetingText: {
    fontSize: 16,
  },

  // ---------- MEETING FINDER SCREEN -----------
  container: {
    flex: 1,
  },
  containerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 3,
  },
  list: {
    flex: 2,
  },
  listItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  listItemText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  listItemSubText: {
    fontSize: 14,
    color: '#555',
  },
  header: {
    fontSize: 24,
    textAlign: 'center',
    marginVertical: 20,
  },
  noMeetingsContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMeetingsText: {
    fontSize: 18,
    color: '#888',
  },
  errorContainer: {
    padding: 10,
    backgroundColor: '#fdecea',
  },
  errorText: {
    color: '#d93025',
    fontSize: 14,
    textAlign: 'center',
  },
});
