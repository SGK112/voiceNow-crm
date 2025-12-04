import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../../types';
import api from '../../services/api';

interface TaskListProps {
  dealId: string;
  tasks: Task[];
  onTaskAdded: () => void;
  onTaskUpdated: () => void;
}

const TaskCard: React.FC<{ task: Task; onTaskUpdated: () => void; dealId: string }> = ({ task, onTaskUpdated, dealId }) => {
  const toggleComplete = async () => {
    try {
      await api.patch(`/deals/${dealId}/tasks/${task._id}`, { isCompleted: !task.isCompleted });
      onTaskUpdated();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  return (
    <View style={styles.taskCard}>
      <TouchableOpacity onPress={toggleComplete} style={styles.taskCheckbox}>
        <Ionicons name={task.isCompleted ? 'checkbox' : 'square-outline'} size={24} color={task.isCompleted ? '#22c55e' : '#9ca3af'} />
      </TouchableOpacity>
      <View style={styles.taskInfo}>
        <Text style={[styles.taskTitle, task.isCompleted && styles.completedTaskTitle]}>{task.title}</Text>
        {task.dueDate && <Text style={styles.taskDueDate}>{new Date(task.dueDate).toLocaleDateString()}</Text>}
      </View>
    </View>
  );
};

const TaskList: React.FC<TaskListProps> = ({ dealId, tasks, onTaskAdded, onTaskUpdated }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const addTask = async () => {
    if (!newTaskTitle.trim()) {
      return;
    }

    try {
      await api.post(`/deals/${dealId}/tasks`, { title: newTaskTitle });
      setNewTaskTitle('');
      onTaskAdded();
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Error', 'Failed to add task');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasks</Text>
      <FlatList
        data={tasks}
        renderItem={({ item }) => <TaskCard task={item} onTaskUpdated={onTaskUpdated} dealId={dealId} />}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={<Text style={styles.emptyText}>No tasks for this deal yet.</Text>}
      />
      <View style={styles.addTaskContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a new task..."
          placeholderTextColor="#6b7280"
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
        />
        <TouchableOpacity style={styles.addButton} onPress={addTask}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e2e3e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  taskCheckbox: {
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    color: '#fff',
    fontSize: 16,
  },
  completedTaskTitle: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  taskDueDate: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
  },
  addTaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#2e2e3e',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  addButton: {
    marginLeft: 12,
    backgroundColor: '#a855f7',
    padding: 12,
    borderRadius: 12,
  },
});

export default TaskList;
