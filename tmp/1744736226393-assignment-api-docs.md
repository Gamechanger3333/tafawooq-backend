# Assignment API Documentation

## Base URL
```
http://localhost:YOUR_PORT
```

## Authentication
All endpoints require authentication with JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

### 1. Create Assignment
**POST** `/assignments`

**Authorization:**
- Role: `tutor` or `admin`

**Request Body (form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| course_id | String | Yes | ID of the course |
| title | String | Yes | Title of the assignment |
| description | String | No | Description of the assignment |
| dueDate | Date | Yes | Due date (format: YYYY-MM-DD) |
| badgeText | String/Array | No | Tags for the assignment |
| attachment | File | No | General attachment file |
| document | File | No | Assignment document file |

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Assignment created successfully",
  "data": {
    "_id": "60a123456789abcdef123456",
    "course_id": "60a123456789abcdef123457",
    "title": "Assignment Title",
    "description": "Assignment Description",
    "dueDate": "2025-05-15T00:00:00.000Z",
    "badgeText": ["Important", "Exam"],
    "attachment": "tmp/1618489876543-attachment.pdf",
    "document": "tmp/1618489876543-document.docx",
    "documentName": "assignment-instructions.docx",
    "documentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "created_by": "60a123456789abcdef123458",
    "created_at": "2025-04-15T00:00:00.000Z",
    "updated_at": "2025-04-15T00:00:00.000Z"
  }
}
```

### 2. Get Assignments by Course
**GET** `/assignments/course/:courseId`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| courseId | String | Yes | ID of the course |

**Response (Success - 200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "60a123456789abcdef123456",
      "course_id": "60a123456789abcdef123457",
      "title": "Assignment 1",
      "description": "Description 1",
      "dueDate": "2025-05-15T00:00:00.000Z",
      "badgeText": ["Important"],
      "attachment": "tmp/1618489876543-attachment.pdf",
      "document": "tmp/1618489876543-document.docx",
      "documentName": "assignment1.docx",
      "documentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "created_by": "60a123456789abcdef123458",
      "created_at": "2025-04-15T00:00:00.000Z",
      "updated_at": "2025-04-15T00:00:00.000Z"
    },
    {
      "_id": "60a123456789abcdef123459",
      "course_id": "60a123456789abcdef123457",
      "title": "Assignment 2",
      "description": "Description 2",
      "dueDate": "2025-05-20T00:00:00.000Z",
      "badgeText": ["Exam"],
      "attachment": null,
      "document": "tmp/1618489876544-document.pdf",
      "documentName": "assignment2.pdf",
      "documentType": "application/pdf",
      "created_by": "60a123456789abcdef123458",
      "created_at": "2025-04-16T00:00:00.000Z",
      "updated_at": "2025-04-16T00:00:00.000Z"
    }
  ]
}
```

### 3. Get Assignment by ID
**GET** `/assignments/:id`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | String | Yes | ID of the assignment |

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "_id": "60a123456789abcdef123456",
    "course_id": "60a123456789abcdef123457",
    "title": "Assignment Title",
    "description": "Assignment Description",
    "dueDate": "2025-05-15T00:00:00.000Z",
    "badgeText": ["Important", "Exam"],
    "attachment": "tmp/1618489876543-attachment.pdf",
    "document": "tmp/1618489876543-document.docx",
    "documentName": "original-filename.docx",
    "documentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "created_by": "60a123456789abcdef123458",
    "created_at": "2025-04-15T00:00:00.000Z",
    "updated_at": "2025-04-15T00:00:00.000Z"
  }
}
```

### 4. Download Assignment Document
**GET** `/assignments/:id/download-document`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | String | Yes | ID of the assignment |

**Response (Success - 200):**
- File download with appropriate headers

### 5. Update Assignment
**PUT** `/assignments/:id`

**Authorization:**
- Role: `tutor` or `admin`
- Must be the creator of the assignment or an admin

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | String | Yes | ID of the assignment |

**Request Body (form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | String | No | Title of the assignment |
| description | String | No | Description of the assignment |
| dueDate | Date | No | Due date (format: YYYY-MM-DD) |
| badgeText | String/Array | No | Tags for the assignment |
| attachment | File | No | General attachment file |
| document | File | No | Assignment document file |

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Assignment updated successfully",
  "data": {
    "_id": "60a123456789abcdef123456",
    "course_id": "60a123456789abcdef123457",
    "title": "Updated Title",
    "description": "Updated Description",
    "dueDate": "2025-05-20T00:00:00.000Z",
    "badgeText": ["Updated"],
    "attachment": "tmp/1618489876545-attachment.pdf",
    "document": "tmp/1618489876545-document.docx",
    "documentName": "updated-filename.docx",
    "documentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "created_by": "60a123456789abcdef123458",
    "created_at": "2025-04-15T00:00:00.000Z",
    "updated_at": "2025-04-16T00:00:00.000Z"
  }
}
```

### 6. Delete Assignment
**DELETE** `/assignments/:id`

**Authorization:**
- Role: `tutor` or `admin`
- Must be the creator of the assignment or an admin

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | String | Yes | ID of the assignment |

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Assignment deleted successfully"
}
```

## Testing with Postman

### Create Assignment
1. Create a new request in Postman
2. Set method to POST and URL to `{{baseUrl}}/assignments`
3. Add Authorization header with your JWT token
4. In the Body tab, select "form-data"
5. Add the following key-value pairs:
   - course_id: [your course ID]
   - title: "Test Assignment"
   - description: "This is a test assignment"
   - dueDate: "2025-05-15"
   - badgeText: "Important"
   - Select "File" type for both attachment and document keys
   - Upload files for attachment and document
6. Send the request

### Get Assignments by Course
1. Create a new request in Postman
2. Set method to GET and URL to `{{baseUrl}}/assignments/course/[courseId]`
3. Add Authorization header with your JWT token
4. Send the request

### Update Assignment Document
1. Create a new request in Postman
2. Set method to PUT and URL to `{{baseUrl}}/assignments/[assignmentId]`
3. Add Authorization header with your JWT token
4. In the Body tab, select "form-data"
5. Add fields you want to update (title, description, etc.)
6. Include new document file if you want to update it
7. Send the request

### Download Document
1. Create a new request in Postman
2. Set method to GET and URL to `{{baseUrl}}/assignments/[assignmentId]/download-document`
3. Add Authorization header with your JWT token
4. Send the request
5. File will be downloaded automatically
