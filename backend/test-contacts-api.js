/**
 * Contact API Test Script
 * Run this to test the contact management endpoints
 *
 * Usage: node test-contacts-api.js
 */

import axios from 'axios';

const API_URL = 'http://localhost:5001';
let createdContactId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testGetContacts() {
  log('\n1. Testing GET /api/mobile/contacts', 'blue');
  try {
    const response = await axios.get(`${API_URL}/api/mobile/contacts`);
    log(`✓ Success: Found ${response.data.count} contacts`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed: ${error.message}`, 'red');
    return false;
  }
}

async function testCreateContact() {
  log('\n2. Testing POST /api/mobile/contacts', 'blue');
  try {
    const contactData = {
      name: 'Test Contact',
      phone: '+1 (555) 000-' + Math.floor(Math.random() * 10000),
      email: 'test@example.com',
      company: 'Test Company',
      notes: 'This is a test contact created by the API test script'
    };

    const response = await axios.post(`${API_URL}/api/mobile/contacts`, contactData);
    createdContactId = response.data.contact._id;
    log(`✓ Success: Created contact with ID ${createdContactId}`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function testGetSingleContact() {
  log('\n3. Testing GET /api/mobile/contacts/:id', 'blue');
  if (!createdContactId) {
    log('✗ Skipped: No contact ID available', 'yellow');
    return false;
  }

  try {
    const response = await axios.get(`${API_URL}/api/mobile/contacts/${createdContactId}`);
    log(`✓ Success: Retrieved contact "${response.data.contact.name}"`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function testUpdateContact() {
  log('\n4. Testing PUT /api/mobile/contacts/:id', 'blue');
  if (!createdContactId) {
    log('✗ Skipped: No contact ID available', 'yellow');
    return false;
  }

  try {
    const updatedData = {
      name: 'Updated Test Contact',
      phone: '+1 (555) 111-2222',
      email: 'updated@example.com',
      company: 'Updated Company',
      notes: 'This contact has been updated'
    };

    const response = await axios.put(
      `${API_URL}/api/mobile/contacts/${createdContactId}`,
      updatedData
    );
    log(`✓ Success: Updated contact name to "${response.data.contact.name}"`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function testAddConversation() {
  log('\n5. Testing POST /api/mobile/contacts/:id/conversation', 'blue');
  if (!createdContactId) {
    log('✗ Skipped: No contact ID available', 'yellow');
    return false;
  }

  try {
    const conversationData = {
      type: 'call',
      direction: 'outgoing',
      content: 'Test call conversation',
      metadata: { duration: 120 }
    };

    const response = await axios.post(
      `${API_URL}/api/mobile/contacts/${createdContactId}/conversation`,
      conversationData
    );
    log(`✓ Success: Added conversation to contact`, 'green');
    log(`  Total calls: ${response.data.contact.totalCalls}`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function testSearchContacts() {
  log('\n6. Testing GET /api/mobile/contacts/search/:query', 'blue');
  try {
    const response = await axios.get(`${API_URL}/api/mobile/contacts/search/test`);
    log(`✓ Success: Found ${response.data.count} contacts matching "test"`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function testBulkImport() {
  log('\n7. Testing POST /api/mobile/contacts/import', 'blue');
  try {
    const contactsToImport = [
      {
        name: 'Bulk Import 1',
        phone: '+1 (555) 100-1111',
        email: 'bulk1@example.com',
        company: 'Import Test Co'
      },
      {
        name: 'Bulk Import 2',
        phone: '+1 (555) 100-2222',
        email: 'bulk2@example.com',
        company: 'Import Test Co'
      }
    ];

    const response = await axios.post(`${API_URL}/api/mobile/contacts/import`, {
      contacts: contactsToImport
    });

    log(`✓ Success: Imported ${response.data.imported} contacts`, 'green');
    log(`  Skipped: ${response.data.skipped}`, 'yellow');
    return true;
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function testDeleteContact() {
  log('\n8. Testing DELETE /api/mobile/contacts/:id', 'blue');
  if (!createdContactId) {
    log('✗ Skipped: No contact ID available', 'yellow');
    return false;
  }

  try {
    await axios.delete(`${API_URL}/api/mobile/contacts/${createdContactId}`);
    log(`✓ Success: Deleted contact with ID ${createdContactId}`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function testDuplicatePrevention() {
  log('\n9. Testing duplicate phone number prevention', 'blue');
  try {
    const contactData = {
      name: 'Duplicate Test 1',
      phone: '+1 (555) 999-9999',
      email: 'dup1@example.com'
    };

    // Create first contact
    await axios.post(`${API_URL}/api/mobile/contacts`, contactData);

    // Try to create duplicate
    try {
      await axios.post(`${API_URL}/api/mobile/contacts`, {
        ...contactData,
        name: 'Duplicate Test 2'
      });
      log('✗ Failed: Duplicate contact was created', 'red');
      return false;
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message.includes('already exists')) {
        log('✓ Success: Duplicate prevention working', 'green');
        return true;
      }
      throw error;
    }
  } catch (error) {
    log(`✗ Failed: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('='.repeat(60), 'blue');
  log('Contact API Test Suite', 'blue');
  log('='.repeat(60), 'blue');

  const results = [];

  results.push(await testGetContacts());
  results.push(await testCreateContact());
  results.push(await testGetSingleContact());
  results.push(await testUpdateContact());
  results.push(await testAddConversation());
  results.push(await testSearchContacts());
  results.push(await testBulkImport());
  results.push(await testDeleteContact());
  results.push(await testDuplicatePrevention());

  const passed = results.filter(r => r === true).length;
  const failed = results.filter(r => r === false).length;

  log('\n' + '='.repeat(60), 'blue');
  log('Test Results', 'blue');
  log('='.repeat(60), 'blue');
  log(`Total Tests: ${results.length}`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log('='.repeat(60), 'blue');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  log('Make sure the backend server is running on port 5001', 'yellow');
  process.exit(1);
});
