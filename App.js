import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Button,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

const FLASK_API_URL = 'https://reactappdb.onrender.com';

const Stack = createStackNavigator();

const MeetingFinderScreen = ({ navigation }) => {
  const [meetings, setMeetings] = useState([
    {
      id: 1,
      title: 'Default Meeting',
      description: 'This is a default meeting for testing.',
      latitude: 37.7749,
      longitude: -122.4194,
    },
  ]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await fetch(`${FLASK_API_URL}/meetings`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        setMeetings((prev) => [...prev, ...data]);
      } catch (error) {
        console.error('Error fetching meetings:', error);
      }
    };
    fetchMeetings();
  }, []);

  const addMeeting = async () => {
    try {
      if (newMeeting.title && newMeeting.description && newMeeting.latitude && newMeeting.longitude) {
        const response = await fetch(`${FLASK_API_URL}/meetings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newMeeting.title,
            description: newMeeting.description,
            latitude: parseFloat(newMeeting.latitude),
            longitude: parseFloat(newMeeting.longitude),
          }),
        });

        if (!response.ok) {
          alert('Error creating meeting');
          return;
        }
        const createdMeeting = await response.json();
        setMeetings([...meetings, createdMeeting]);
        setNewMeeting({ title: '', description: '', latitude: '', longitude: '' });
      } else {
        alert('Please fill out all fields');
      }
    } catch (error) {
      console.error('Error adding meeting:', error);
      alert('Something went wrong while adding the meeting.');
    }
  };

  const renderMeetingItem = ({ item }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => setSelectedMeeting(item)}
    >
      <Text style={styles.listItemText}>{item.title}</Text>
      <Text style={styles.listItemSubText}>{item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      {/* Top Navigation Buttons */}
      <View style={styles.topNavContainer}>
        <Button title="Check-In" onPress={() => navigation.navigate('Check-In')} />
        <Button title="Chat" onPress={() => navigation.navigate('Chat')} />
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.7749,
          longitude: -122.4194,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
        {meetings.map((meeting) => (
          <Marker
            key={meeting.id}
            coordinate={{ latitude: meeting.latitude, longitude: meeting.longitude }}
            title={meeting.title}
            description={meeting.description}
            onPress={() => setSelectedMeeting(meeting)}
          />
        ))}
      </MapView>

      {/* Bottom Container (FlatList + Add Form) */}
      <View style={styles.bottomContainer}>
        <FlatList
          data={meetings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMeetingItem}
          style={styles.list}
        />

        <View style={styles.addMeetingForm}>
          <TextInput
            style={styles.input}
            placeholder="Title"
            value={newMeeting.title}
            onChangeText={(text) => setNewMeeting({ ...newMeeting, title: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Description"
            value={newMeeting.description}
            onChangeText={(text) => setNewMeeting({ ...newMeeting, description: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Latitude"
            keyboardType="numeric"
            value={newMeeting.latitude}
            onChangeText={(text) => setNewMeeting({ ...newMeeting, latitude: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Longitude"
            keyboardType="numeric"
            value={newMeeting.longitude}
            onChangeText={(text) => setNewMeeting({ ...newMeeting, longitude: text })}
          />
          <Button title="Add Meeting" onPress={addMeeting} />
        </View>
      </View>

      {selectedMeeting && (
        <View style={styles.selectedMeetingBox}>
          <Text style={styles.selectedMeetingTitle}>{selectedMeeting.title}</Text>
          <Text style={styles.selectedMeetingDescription}>
            {selectedMeeting.description}
          </Text>
          <Button title="Close" onPress={() => setSelectedMeeting(null)} />
        </View>
      )}
    </View>
  );
};

const CheckInScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [selfie, setSelfie] = useState(null);

  const fetchLocation = () => {
    setLocation({ latitude: 37.7749, longitude: -122.4194 });
  };

  const uploadSelfie = () => {
    setSelfie('selfie.jpg');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Check-In</Text>
      <Button title="Get Location" onPress={fetchLocation} />
      {location && (
        <Text style={styles.info}>
          Location: {location.latitude}, {location.longitude}
        </Text>
      )}
      <Button title="Upload Selfie" onPress={uploadSelfie} />
      {selfie && <Text style={styles.info}>Selfie Uploaded: {selfie}</Text>}
      <Button title="Submit Check-In" onPress={() => alert('Check-In Submitted!')} />
      <Button title="Go to Chat" onPress={() => navigation.navigate('Chat')} />
    </View>
  );
};

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const sendMessage = () => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { text: newMessage, id: Date.now() },
    ]);
    setNewMessage('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Chat</Text>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <Text style={styles.chatMessage}>{item.text}</Text>}
      />
      <TextInput
        style={styles.input}
        value={newMessage}
        onChangeText={setNewMessage}
        placeholder="Type a message..."
      />
      <Button title="Send" onPress={sendMessage} />
    </View>
  );
};

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Meeting Finder" component={MeetingFinderScreen} />
        <Stack.Screen name="Check-In" component={CheckInScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topNavContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingBottom: 5,
    backgroundColor: '#f5f5f5',
  },
  map: {
    flex: 3,
  },
  bottomContainer: {
    flex: 2,
    backgroundColor: '#fff',
  },
  list: {
    maxHeight: 200,
  },
  addMeetingForm: {
    padding: 10,
    backgroundColor: '#f0f0f0',
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
  selectedMeetingBox: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  selectedMeetingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectedMeetingDescription: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  info: {
    marginVertical: 10,
    fontSize: 16,
  },
  chatMessage: {
    fontSize: 16,
    marginVertical: 5,
    backgroundColor: '#eee',
    padding: 5,
    borderRadius: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
});

export default App;
