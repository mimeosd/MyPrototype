import React, { useState } from 'react';
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

const Stack = createStackNavigator();

const MeetingFinderScreen = ({ navigation }) => {
  const [meetings, setMeetings] = useState([
    {
      id: 1,
      title: "Default Meeting",
      description: "This is a default meeting for testing.",
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

  const addMeeting = () => {
    if (
      newMeeting.title &&
      newMeeting.description &&
      newMeeting.latitude &&
      newMeeting.longitude
    ) {
      const updatedMeetings = [
        ...meetings,
        {
          id: Date.now(),
          title: newMeeting.title,
          description: newMeeting.description,
          latitude: parseFloat(newMeeting.latitude),
          longitude: parseFloat(newMeeting.longitude),
        },
      ];
      setMeetings(updatedMeetings);
      setNewMeeting({ title: '', description: '', latitude: '', longitude: '' });
    } else {
      alert('Please fill out all fields');
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
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.7749,
          longitude: -122.4194,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
        />
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

      <View style={styles.listAndFormContainer}>
        <FlatList
          data={meetings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMeetingItem}
          ListHeaderComponent={
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
          }
        />
      </View>

      {selectedMeeting && (
        <View style={styles.selectedMeetingBox}>
          <Text style={styles.selectedMeetingTitle}>{selectedMeeting.title}</Text>
          <Text style={styles.selectedMeetingDescription}>{selectedMeeting.description}</Text>
          <Button title="Close" onPress={() => setSelectedMeeting(null)} />
        </View>
      )}
    </View>
  );
};

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Meeting Finder" component={MeetingFinderScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 3,
  },
  listAndFormContainer: {
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
  addMeetingForm: {
    padding: 10,
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
});

export default App;
