import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import contactService, { ContactCreateInput } from '../services/ContactService';
import { useTheme } from '../contexts/ThemeContext';

export default function AddEditContactScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { mode, contactId, contact: existingContact } = route.params || {};
  const isEditMode = mode === 'edit';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Validation states
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (isEditMode && existingContact) {
      setName(existingContact.name || '');
      setPhone(existingContact.phone || '');
      setEmail(existingContact.email || '');
      setCompany(existingContact.company || '');
      setNotes(existingContact.notes || '');
    }
  }, [isEditMode, existingContact]);

  const validateName = (value: string) => {
    if (!value.trim()) {
      setNameError('Name is required');
      return false;
    }
    setNameError('');
    return true;
  };

  const validatePhone = (value: string) => {
    if (!value.trim()) {
      setPhoneError('Phone number is required');
      return false;
    }

    // Basic phone number validation (allows various formats)
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    if (!phoneRegex.test(value)) {
      setPhoneError('Invalid phone number format');
      return false;
    }

    setPhoneError('');
    return true;
  };

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      setEmailError('');
      return true; // Email is optional
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Invalid email format');
      return false;
    }

    setEmailError('');
    return true;
  };

  const handleSave = async () => {
    // Validate all fields
    const isNameValid = validateName(name);
    const isPhoneValid = validatePhone(phone);
    const isEmailValid = validateEmail(email);

    if (!isNameValid || !isPhoneValid || !isEmailValid) {
      Alert.alert('Validation Error', 'Please fix the errors before saving');
      return;
    }

    try {
      setSaving(true);

      const contactData: ContactCreateInput = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      let result;
      if (isEditMode && contactId) {
        result = await contactService.updateContact(contactId, contactData);
      } else {
        result = await contactService.createContact(contactData);
      }

      if (result) {
        Alert.alert(
          'Success',
          isEditMode ? 'Contact updated successfully' : 'Contact created successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                if (isEditMode) {
                  navigation.goBack();
                } else {
                  navigation.navigate('ContactsList');
                }
              },
            },
          ]
        );
      }
    } catch (err: any) {
      console.error('Error saving contact:', err);
      Alert.alert(
        'Error',
        err.message || 'Failed to save contact. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Check if form has been modified
    const hasChanges = isEditMode
      ? name !== (existingContact?.name || '') ||
        phone !== (existingContact?.phone || '') ||
        email !== (existingContact?.email || '') ||
        company !== (existingContact?.company || '') ||
        notes !== (existingContact?.notes || '')
      : name || phone || email || company || notes;

    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          {
            text: 'Keep Editing',
            style: 'cancel',
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleCancel} style={[styles.headerButton, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditMode ? 'Edit Contact' : 'Add Contact'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.headerButton, { backgroundColor: colors.backgroundSecondary }]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar Preview */}
        <View style={[styles.avatarSection, { borderBottomColor: colors.border }]}>
          <View
            style={[
              styles.avatarPreview,
              {
                backgroundColor: name ? getAvatarColor(name) : colors.backgroundTertiary,
              },
            ]}
          >
            <Text style={styles.avatarText}>
              {name ? getInitials(name) : '?'}
            </Text>
          </View>
          <TouchableOpacity style={styles.changeAvatarButton}>
            <Ionicons name="camera" size={20} color={colors.primary} />
            <Text style={[styles.changeAvatarText, { color: colors.primary }]}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Name Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Name <Text style={[styles.required, { color: colors.error }]}>*</Text>
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: nameError ? colors.error : colors.inputBorder }]}>
              <Ionicons name="person-outline" size={20} color={colors.textTertiary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter full name"
                placeholderTextColor={colors.placeholder}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError) validateName(text);
                }}
                onBlur={() => validateName(name)}
              />
            </View>
            {nameError && <Text style={[styles.errorText, { color: colors.error }]}>{nameError}</Text>}
          </View>

          {/* Phone Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Phone <Text style={[styles.required, { color: colors.error }]}>*</Text>
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: phoneError ? colors.error : colors.inputBorder }]}>
              <Ionicons name="call-outline" size={20} color={colors.textTertiary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter phone number"
                placeholderTextColor={colors.placeholder}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (phoneError) validatePhone(text);
                }}
                onBlur={() => validatePhone(phone)}
                keyboardType="phone-pad"
              />
            </View>
            {phoneError && <Text style={[styles.errorText, { color: colors.error }]}>{phoneError}</Text>}
          </View>

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: emailError ? colors.error : colors.inputBorder }]}>
              <Ionicons name="mail-outline" size={20} color={colors.textTertiary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter email address"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) validateEmail(text);
                }}
                onBlur={() => validateEmail(email)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {emailError && <Text style={[styles.errorText, { color: colors.error }]}>{emailError}</Text>}
          </View>

          {/* Company Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Company</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
              <Ionicons name="business-outline" size={20} color={colors.textTertiary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter company name"
                placeholderTextColor={colors.placeholder}
                value={company}
                onChangeText={setCompany}
              />
            </View>
          </View>

          {/* Notes Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
            <View style={[styles.inputContainer, styles.notesInputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={colors.textTertiary}
                style={styles.notesIcon}
              />
              <TextInput
                style={[styles.input, styles.notesInput, { color: colors.text }]}
                placeholder="Add notes about this contact..."
                placeholderTextColor={colors.placeholder}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Helper Text */}
        <View style={styles.helperSection}>
          <Text style={[styles.helperText, { color: colors.textTertiary }]}>
            <Text style={[styles.required, { color: colors.error }]}>*</Text> Required fields
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1b',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1b',
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeAvatarText: {
    fontSize: 16,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  formSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1b',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
  },
  notesInputContainer: {
    alignItems: 'flex-start',
  },
  notesIcon: {
    marginTop: 4,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 4,
  },
  helperSection: {
    paddingHorizontal: 20,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
