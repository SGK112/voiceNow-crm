import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import contactService, { Contact } from '../services/ContactService';
import { debounce } from '../utils/debounce';

interface ContactSection {
  title: string;
  data: Contact[];
}

const groupContacts = (contacts: Contact[]): ContactSection[] => {
  const grouped: { [key: string]: Contact[] } = {};
  contacts.forEach(contact => {
    const firstLetter = contact.name.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(contact);
  });

  return Object.keys(grouped)
    .sort()
    .map(letter => ({
      title: letter,
      data: grouped[letter].sort((a, b) => a.name.localeCompare(b.name))
    }));
};

export function useContacts() {
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchContacts = async (forceRefresh = false) => {
    if (!forceRefresh) setLoading(true);
    const { data, error } = await contactService.getContacts(forceRefresh);
    if (data) {
      setAllContacts(data);
    }
    if (error && !forceRefresh) {
      Alert.alert('Error', 'Failed to fetch contacts. Please try again.');
    }
    setLoading(false);
    setRefreshing(false);
  };

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length > 1) {
        setLoading(true);
        const { data } = await contactService.searchContacts(query);
        setSearchResults(data);
        setLoading(false);
      } else {
        setSearchResults(null);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (searchQuery) {
      debouncedSearch(searchQuery);
    } else {
      fetchContacts(true);
    }
    setRefreshing(false);
  }, [searchQuery, debouncedSearch]);

  const contactSections = useMemo(() => {
    const contactsToDisplay = searchResults !== null ? searchResults : allContacts;
    return groupContacts(contactsToDisplay);
  }, [allContacts, searchResults]);
  
  const totalContacts = useMemo(() => allContacts.length, [allContacts]);
  const activeContacts = useMemo(() => allContacts.filter(c => c.lastInteraction).length, [allContacts]);

  return {
    contactSections,
    searchQuery,
    setSearchQuery,
    loading,
    refreshing,
    onRefresh,
    fetchContacts,
    totalContacts,
    activeContacts
  };
}
