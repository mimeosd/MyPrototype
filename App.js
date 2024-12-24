import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Button,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { Camera } from 'expo-camera';
import * as Calendar from 'expo-calendar';

const FLASK_API_URL = 'https://reactappdb.onrender.com';

function HomeScreen({ navigation }) {
  const [meetingsAttended] = useState(12);
  const [goal] = useState(30);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUpcomingMeetings = async () => {
      try {
        setError(null);
        const response = await fetch(`${FLASK_API_URL}/meetings`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        const now = new Date();
        const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        const filtered = data.filter((m) => {
          if (!m.start_time) return false;
          const st = new Date(m.start_time);
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

  const progress = goal > 0 ? meetingsAttended / goal : 0;
  const progressPercent = `${Math.min(progress * 100, 100)}%`;

  const renderUpcomingMeeting = ({ item }) => (
    <View style={styles.upcomingMeetingItem}>
      <Text style={styles.upcomingMeetingText}>{item.title}</Text>
      {item.start_time && (
        <Text style={styles.upcomingMeetingText}>
          Starts: {new Date(item.start_time).toLocaleString()}
        </Text>
      )}
    </View>
  );

  const renderHeader = () => (
    <>
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
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: progressPercent }]} />
        </View>
        <Text style={styles.progressText}>
          {Math.round(progress * 100)}% Complete
        </Text>
      </View>
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
      <Text style={styles.upcomingTitle}>Upcoming Meetings</Text>
      {error && <Text style={{ color: 'red', marginLeft: 20 }}>{error}</Text>}
      {!error && upcomingMeetings.length === 0 && (
        <Text style={{ marginLeft: 20 }}>No upcoming meetings found.</Text>
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
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied!');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation(loc.coords);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        setError(null);
        const response = await fetch(`${FLASK_API_URL}/meetings`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          setMeetings([]);
          return;
        }
        setMeetings(data);
      } catch (err) {
        console.error('Error fetching meetings:', err);
        setError(err.message);
        setMeetings([]);
      }
    };
    fetchMeetings();
  }, []);

  const distanceInMiles = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  const toRad = (value) => (value * Math.PI) / 180;

  let filteredMeetings = [];
  if (userLocation) {
    filteredMeetings = meetings.filter((m) => {
      if (!m.latitude || !m.longitude) return false;
      const dist = distanceInMiles(
        userLocation.latitude,
        userLocation.longitude,
        parseFloat(m.latitude),
        parseFloat(m.longitude)
      );
      return dist <= 5;
    });
  }

  const addEventToCalendar = async (meeting) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied!', 'Cannot add event to calendar.');
        return;
      }
      const defaultCalendarId = await getDefaultCalendarId();
      const startTime = meeting.start_time
        ? new Date(meeting.start_time)
        : new Date();
      const endTime = meeting.end_time
        ? new Date(meeting.end_time)
        : new Date(Date.now() + 3600000);
      const eventDetails = {
        title: meeting.title || 'Meeting',
        notes: meeting.description || '',
        startDate: startTime,
        endDate: endTime,
        timeZone: 'UTC',
        location: `${meeting.latitude}, ${meeting.longitude}`,
      };
      const eventId = await Calendar.createEventAsync(defaultCalendarId, eventDetails);
      Alert.alert('Success', `Event created (ID: ${eventId})`);
    } catch (err) {
      console.error('Error adding event to calendar:', err);
      Alert.alert('Error', 'Unable to create calendar event');
    }
  };

  const getDefaultCalendarId = async () => {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCalendars = calendars.filter(
      (cal) => cal.isPrimary || cal.source?.name === 'Default'
    );
    if (defaultCalendars.length) {
      return defaultCalendars[0].id;
    }
    if (calendars.length) {
      return calendars[0].id;
    }
    return await createNewCalendar();
  };

  const createNewCalendar = async () => {
    const defaultSource =
      Platform.OS === 'ios'
        ? await Calendar.getDefaultCalendarAsync()
        : { isLocalAccount: true, name: 'Expo Calendar' };
    const newCal = {
      title: 'My Meetings Calendar',
      color: '#512DA8',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultSource.id,
      source: defaultSource,
      name: 'Internal Meetings Calendar',
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    };
    return await Calendar.createCalendarAsync(newCal);
  };

  const renderMeetingItem = ({ item }) => (
    <TouchableOpacity style={styles.listItem}>
      <Text style={styles.listItemText}>{item.title}</Text>
      <Text style={styles.listItemSubText}>{item.description}</Text>
      <View style={{ marginVertical: 5 }}>
        <Button title="Add to Calendar" onPress={() => addEventToCalendar(item)} />
      </View>
      <View style={{ marginVertical: 5 }}>
        <Button
          title="Check-In"
          onPress={() => navigation.navigate('Check-In')}
        />
      </View>
    </TouchableOpacity>
  );

  if (!userLocation) {
    return (
      <View style={styles.center}>
        <Text>Getting your location...</Text>
        {error && <Text style={{ color: 'red' }}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        <Marker
          coordinate={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          }}
          pinColor="blue"
          title="Me"
        />
        {filteredMeetings.map((m) => {
          const lat = parseFloat(m.latitude);
          const lon = parseFloat(m.longitude);
          if (isNaN(lat) || isNaN(lon)) return null;
          return (
            <Marker
              key={m.id}
              coordinate={{ latitude: lat, longitude: lon }}
              title={m.title}
              description={m.description}
            />
          );
        })}
      </MapView>
      {filteredMeetings.length === 0 ? (
        <View style={styles.noMeetingsContainer}>
          <Text style={styles.noMeetingsText}>No meetings within 5 miles.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMeetings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMeetingItem}
          style={styles.list}
        />
      )}
    </View>
  );
}

function CheckInScreen() {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const cameraRef = useRef(null);
  const [cameraType] = useState(Camera?.Constants?.Type?.back);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      await uploadSelfie(photo.uri);
    }
  };

  const uploadSelfie = async (uri) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('selfie', {
        uri,
        name: `selfie_${Date.now()}.jpg`,
        type: 'image/jpg',
      });
      const response = await fetch(`${FLASK_API_URL}/upload_selfie`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      const result = await response.json();
      if (response.ok) {
        Alert.alert('Uploaded!', 'Selfie uploaded successfully.');
      } else {
        Alert.alert('Error', result.error || 'Something went wrong.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Error', 'Could not upload selfie.');
    } finally {
      setIsUploading(false);
    }
  };

  if (hasCameraPermission === null) {
    return (
      <View style={styles.containerCenter}>
        <Text>Requesting Camera Permission...</Text>
      </View>
    );
  }
  if (hasCameraPermission === false) {
    return (
      <View style={styles.containerCenter}>
        <Text>No access to camera.</Text>
      </View>
    );
  }
  if (!Camera || !Camera.Constants) {
    return (
      <View style={styles.containerCenter}>
        <Text>expo-camera not properly installed or imported.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.cameraPreview}
        ref={cameraRef}
        type={cameraType}
        ratio="16:9"
      />
      <View style={styles.cameraButtonsContainer}>
        {isUploading ? (
          <>
            <ActivityIndicator size="large" color="#000" />
            <Text>Uploading selfie...</Text>
          </>
        ) : (
          <>
            <Button title="Take Photo & Upload" onPress={takePicture} />
            <View style={{ marginVertical: 10 }}>
              <Button
                title="Submit Check-In"
                onPress={() => Alert.alert('Check-In Submitted!')}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

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

const styles = StyleSheet.create({
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
  cameraPreview: {
    flex: 3,
  },
  cameraButtonsContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
