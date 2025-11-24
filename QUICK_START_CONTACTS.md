# Quick Start Guide - Contact Management System

## Getting Started

### 1. Start the Backend Server
```bash
cd /Users/homepc/voiceFlow-crm-1/backend
npm run dev
```
The server should start on port 5001.

### 2. Start the Mobile App
```bash
cd /Users/homepc/voiceFlow-crm-1/mobile
npm start
```
Then press:
- `i` for iOS simulator
- `a` for Android emulator
- Scan QR code for Expo Go on physical device

### 3. Test the Backend API (Optional)
```bash
cd /Users/homepc/voiceFlow-crm-1/backend
node test-contacts-api.js
```

## Using the Contact Management System

### Accessing Contacts
1. Open the VoiceFlow CRM mobile app
2. Tap the **Contacts** tab (chatbox icon)
3. You'll see the main contact list

### Adding a Contact
1. Tap the purple **+ FAB** button (bottom-right)
2. Fill in:
   - **Name** (required)
   - **Phone** (required)
   - Email (optional)
   - Company (optional)
   - Notes (optional)
3. Tap **Save** in the top-right
4. Contact appears in the list

### Viewing Contact Details
1. Tap any contact in the list
2. See full information, quick actions, and history
3. Use quick action buttons:
   - **Call** - Opens phone dialer
   - **Message** - Opens SMS app
   - **Email** - Opens email client

### Editing a Contact
1. Open contact details
2. Tap **edit icon** (pencil) in header
3. Modify any fields
4. Tap **Save**

### Deleting a Contact
1. Open contact details
2. Tap **trash icon** in header
3. Confirm deletion
4. Contact is removed (soft delete)

### Importing Contacts from Phone
1. From contact list, tap **download icon** in header
2. Grant contacts permission when prompted
3. Select contacts to import (checkboxes)
4. Use **Select All** to import all at once
5. Tap **Import X Contacts** button
6. See import summary
7. Imported contacts appear in list

### Searching Contacts
1. Use search bar at top of contact list
2. Type name, phone, email, or company
3. Results filter in real-time
4. Tap **X** to clear search

### Pull to Refresh
1. Pull down on contact list
2. Releases to refresh contacts from server
3. Loading indicator shows progress

## Features Overview

### Contact List (ContactsScreen)
- Alphabetically grouped contacts (A, B, C...)
- Search functionality
- Quick actions (Call, SMS, Info)
- Last interaction timestamps
- Color-coded avatars with initials
- Pull-to-refresh
- Empty state with import button
- FAB for adding contacts

### Contact Details (ContactDetailsScreen)
- Large avatar with initials
- Contact information display
- Quick action buttons (Call, SMS, Email)
- Recent activity/conversation history
- Notes section
- Edit/Delete in header
- Back button navigation

### Add/Edit Contact (AddEditContactScreen)
- Avatar preview
- Form with validation
- Required field indicators
- Real-time error messages
- Save/Cancel buttons
- Discard changes warning

### Import Contacts (ContactImportScreen)
- Permission request UI
- List of phone contacts
- Select All/None toggle
- Selected count
- Bulk import
- Progress indication
- Import results summary

## API Endpoints Available

```
GET    /api/mobile/contacts              - List all contacts
GET    /api/mobile/contacts/:id          - Get single contact
POST   /api/mobile/contacts              - Create contact
PUT    /api/mobile/contacts/:id          - Update contact
DELETE /api/mobile/contacts/:id          - Delete contact
POST   /api/mobile/contacts/import       - Bulk import
GET    /api/mobile/contacts/search/:query - Search contacts
POST   /api/mobile/contacts/:id/conversation - Add conversation
```

## Testing with Postman/cURL

### Create a Contact
```bash
curl -X POST http://localhost:5001/api/mobile/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "+1 (555) 123-4567",
    "email": "john@example.com",
    "company": "Acme Corp"
  }'
```

### Get All Contacts
```bash
curl http://localhost:5001/api/mobile/contacts
```

### Search Contacts
```bash
curl http://localhost:5001/api/mobile/contacts/search/john
```

### Import Multiple Contacts
```bash
curl -X POST http://localhost:5001/api/mobile/contacts/import \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {"name": "Alice", "phone": "+1 (555) 111-1111", "email": "alice@example.com"},
      {"name": "Bob", "phone": "+1 (555) 222-2222", "email": "bob@example.com"}
    ]
  }'
```

## Troubleshooting

### Contacts Not Loading
**Problem:** Empty contact list
**Solution:**
1. Check backend is running (port 5001)
2. Verify API URL in ContactsScreen.tsx matches your setup
3. Check network connection
4. Clear app cache and restart

### Import Not Working
**Problem:** Can't import contacts from phone
**Solution:**
1. Grant contacts permission in device settings
2. Restart the app
3. Ensure device has contacts to import
4. Check console logs for errors

### Can't Call/SMS from App
**Problem:** Quick actions not working
**Solution:**
1. Test on physical device (not simulator)
2. Verify phone/SMS apps are installed
3. Grant necessary permissions
4. Check phone number format

### Duplicate Contact Error
**Problem:** "Contact already exists" message
**Solution:**
- This is expected behavior
- Contacts with same phone number are prevented
- Edit existing contact or use different phone number

### Search Not Finding Contacts
**Problem:** Search returns no results
**Solution:**
1. Ensure contacts are loaded first
2. Try different search terms
3. Check spelling
4. Pull to refresh and try again

## Common Tasks

### Quickly Add Test Data
Use the API test script:
```bash
cd /Users/homepc/voiceFlow-crm-1/backend
node test-contacts-api.js
```
This creates several test contacts automatically.

### Clear All Test Contacts
Currently requires database access. Use MongoDB Compass or:
```javascript
// In MongoDB shell or Compass
db.contacts.deleteMany({ importSource: 'manual' })
```

### Export Contact List
Use the API:
```bash
curl http://localhost:5001/api/mobile/contacts > contacts.json
```

### Check API Health
```bash
curl http://localhost:5001/api/mobile/stats
```

## Development Tips

### Edit Screens Location
```
/Users/homepc/voiceFlow-crm-1/mobile/src/screens/
  - ContactsScreen.tsx
  - ContactDetailsScreen.tsx
  - AddEditContactScreen.tsx
  - ContactImportScreen.tsx
```

### Backend Files
```
/Users/homepc/voiceFlow-crm-1/backend/
  - models/Contact.js
  - routes/mobile.js
  - test-contacts-api.js
```

### Navigation Setup
```
/Users/homepc/voiceFlow-crm-1/mobile/src/navigation/
  - AppNavigator.tsx
```

### Hot Reload
Changes to .tsx files will hot reload automatically in Expo.

### Backend Changes
Nodemon should auto-restart the server when files change.

### Debugging
- Mobile: Use React Native Debugger or Expo Dev Tools
- Backend: Check terminal logs or use VS Code debugger

## Next Steps

### Recommended Workflow
1. Test adding a contact manually
2. Test editing the contact
3. Test deleting the contact
4. Test importing contacts from phone
5. Test search functionality
6. Test quick actions (Call, SMS)
7. Test on physical device

### Customization Ideas
1. Change color scheme (search for #8b5cf6 to change purple)
2. Add custom fields
3. Add contact groups/tags
4. Add photo upload
5. Add export functionality
6. Add contact merge feature

### Integration Ideas
1. Link contacts to leads
2. Track call history automatically
3. Send bulk SMS to contacts
4. Create email campaigns
5. Schedule follow-ups

## Need Help?

### Documentation
- Full docs: `/Users/homepc/voiceFlow-crm-1/mobile/CONTACTS_FEATURE.md`
- Summary: `/Users/homepc/voiceFlow-crm-1/CONTACTS_IMPLEMENTATION_SUMMARY.md`

### Check Logs
- Mobile: Expo Dev Tools console
- Backend: Terminal where server is running

### Common Files to Check
- API URL: `ContactsScreen.tsx` (line 9)
- Backend routes: `backend/routes/mobile.js`
- Database model: `backend/models/Contact.js`

---

**Quick Reference Card**

| Action | Screen | Button/Icon |
|--------|--------|-------------|
| Add Contact | Contact List | Purple FAB (bottom-right) |
| Import Contacts | Contact List | Download icon (top-right) |
| View Contact | Contact List | Tap any contact |
| Edit Contact | Contact Details | Pencil icon (top-right) |
| Delete Contact | Contact Details | Trash icon (top-right) |
| Call Contact | Contact List/Details | Green phone icon |
| SMS Contact | Contact List/Details | Purple chat icon |
| Search Contacts | Contact List | Search bar (top) |

---

**Version:** 1.0.0
**Last Updated:** 2025-11-24
**Status:** Production Ready
