const Assignment = require("../models/assignmentModel");
const Course = require("../models/coursesModel");
const fs = require("fs");
const path = require("path");

// Helper function to handle errors
const handleError = (error, res, message = "Server error") => {
  console.error(`Error: ${message}`, error);
  return res.status(500).json({
    success: false,
    message,
    error: error.message
  });
};

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return id && id.match(/^[0-9a-fA-F]{24}$/);
};

// Create a new assignment
exports.createAssignment = async (req, res) => {
  try {
    const { course_id, title, description, dueDate, badgeText } = req.body;

    // Basic validation
    if (!course_id || !title || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "course_id, title, and dueDate are required fields"
      });
    }

    // Validate course_id
    if (!isValidObjectId(course_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID format"
      });
    }

    // Check if course exists
    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Verify the user is the owner of the course
    if (course.user_id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to add assignments to this course"
      });
    }

    // Initialize file attachments
    let attachment = null;
    let document = null;
    let documentName = null;
    let documentType = null;

    // Handle file uploads
    if (req.files) {
      // Handle attachment file if present
      if (req.files.attachment && req.files.attachment[0]) {
        attachment = req.files.attachment[0].path;
      }

      // Handle document file if present
      if (req.files.document && req.files.document[0]) {
        const documentFile = req.files.document[0];
        document = documentFile.path;
        documentName = documentFile.originalname;
        documentType = documentFile.mimetype;
      }
    }

    // Create new assignment object
    const newAssignment = new Assignment({
      course_id,
      title,
      description: description || "",
      dueDate,
      badgeText: badgeText ? (Array.isArray(badgeText) ? badgeText : [badgeText]) : [],
      attachment,
      document,
      documentName,
      documentType,
      created_by: req.user.id
    });

    // Save assignment to database
    const savedAssignment = await newAssignment.save();

    res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      data: savedAssignment
    });
  } catch (error) {
    return handleError(error, res, "Failed to create assignment");
  }
};

// Get all assignments for a course
exports.getAssignmentsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Validate courseId
    if (!isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID format"
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Fetch assignments
    const assignments = await Assignment.find({ course_id: courseId })
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    return handleError(error, res, "Failed to fetch assignments");
  }
};

// Get a single assignment by ID
exports.getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate assignment ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID format"
      });
    }

    // Find assignment
    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    return handleError(error, res, "Failed to fetch assignment");
  }
};


//downloadAssignmentDocument function
exports.downloadAssignmentDocument = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate assignment ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assignment ID format'
      });
    }

    // Find assignment
    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if document exists
    if (!assignment.document) {
      return res.status(404).json({
        success: false,
        message: 'No document attached to this assignment'
      });
    }

    // Log for debugging
    console.log(`Document path from DB: ${assignment.document}`);
    console.log(`Document name from DB: ${assignment.documentName}`);
    console.log(`Document type from DB: ${assignment.documentType}`);

    // Get the document filename - ensure we get just the filename without path
    const documentFilename = path.basename(assignment.document);

    // First try the exact path from the database
    let filePath = assignment.document;

    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      console.log(`Found file at original path: ${filePath}`);
    } catch (err) {
      console.log(`File not found at original path: ${filePath}`);

      // If the exact path failed, try to find the file in the tmp directory
      const tmpDir = path.resolve(process.cwd(), 'tmp');

      try {
        const files = await fs.promises.readdir(tmpDir);
        console.log(`Files in tmp directory: ${files.join(', ')}`);

        // First, try to match the exact filename from the assignment.document path
        let matchingFile = files.find(file => file === documentFilename);

        // If not found and the original filename has a timestamp, try looking for files with same original name part
        if (!matchingFile && documentFilename.includes('-')) {
          const originalFilePart = documentFilename.split('-').slice(1).join('-');
          console.log(`Looking for files containing: ${originalFilePart}`);

          // Look for most recent file that contains the original filename
          const matchingFiles = files.filter(file => file.includes(originalFilePart));

          if (matchingFiles.length > 0) {
            // Sort by creation time (newest first) to get the most recent upload
            const fileStats = await Promise.all(
              matchingFiles.map(async file => {
                const fullPath = path.join(tmpDir, file);
                const stats = await fs.promises.stat(fullPath);
                return { file, stats };
              })
            );

            fileStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
            matchingFile = fileStats[0].file;
          }
        }

        if (matchingFile) {
          filePath = path.join(tmpDir, matchingFile);
          console.log(`Found file in tmp directory: ${filePath}`);
        } else {
          return res.status(404).json({
            success: false,
            message: 'Document file not found on server'
          });
        }
      } catch (dirError) {
        console.error(`Error reading tmp directory: ${dirError.message}`);
        return res.status(404).json({
          success: false,
          message: 'Document file not found on server'
        });
      }
    }

    // Use stored document name if available, otherwise extract from path
    let fileName = assignment.documentName;

    // If documentName is not available, extract the original name from the path
    if (!fileName) {
      // If filename has a timestamp prefix (like "1746619260608-4 Compartments.pdf")
      if (documentFilename.includes('-')) {
        fileName = documentFilename.split('-').slice(1).join('-');
      } else {
        fileName = documentFilename;
      }
    }

    // Ensure we have a valid content type
    let contentType = assignment.documentType;

    // If documentType is not available or invalid, determine from file extension
    if (!contentType || contentType === 'application/octet-stream') {
      contentType = mime.lookup(fileName) || mime.lookup(filePath) || 'application/octet-stream';
    }

    // For PDFs, ensure the content type is correct
    if (fileName.toLowerCase().endsWith('.pdf')) {
      contentType = 'application/pdf';
    }

    // Log file details for debugging
    console.log(`Sending file: ${filePath}`);
    console.log(`File name: ${fileName}`);
    console.log(`Content type: ${contentType}`);

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    console.log(`attachment; filename="${fileName}`)
    // Get file stats
    const stats = await fs.promises.stat(filePath);
    res.setHeader('Content-Length', stats.size);
    // console.log('stats.size', stats)

    // Stream the file
    const fileStream = fs.createReadStream(filePath);

    fileStream.on('error', error => {
      console.error(`Error streaming file: ${error.message}`);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error streaming file'
        });
      }
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error('Document download error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to download document',
      error: error.message
    });
  }
}


// Update an assignment
exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, badgeText } = req.body;

    // Validate assignment ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID format"
      });
    }

    // Find the assignment
    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Check if the user is authorized to update this assignment
    if (assignment.created_by.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this assignment"
      });
    }

    // Initialize update data
    const updateData = {
      title: title || assignment.title,
      description: description !== undefined ? description : assignment.description,
      dueDate: dueDate || assignment.dueDate,
      badgeText: badgeText ? (Array.isArray(badgeText) ? badgeText : [badgeText]) : assignment.badgeText
    };

    // Handle file updates
    if (req.files) {
      // Handle attachment file if present
      if (req.files.attachment && req.files.attachment[0]) {
        // Delete old attachment if exists
        if (assignment.attachment && fs.existsSync(assignment.attachment)) {
          fs.unlinkSync(assignment.attachment);
        }
        updateData.attachment = req.files.attachment[0].path;
      }

      // Handle document file if present
      if (req.files.document && req.files.document[0]) {
        // Delete old document if exists
        if (assignment.document && fs.existsSync(assignment.document)) {
          fs.unlinkSync(assignment.document);
        }
        updateData.document = req.files.document[0].path;
        updateData.documentName = req.files.document[0].originalname;
        updateData.documentType = req.files.document[0].mimetype;
      }
    }

    // Update assignment
    const updatedAssignment = await Assignment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      data: updatedAssignment
    });
  } catch (error) {
    return handleError(error, res, "Failed to update assignment");
  }
};

// Delete an assignment
exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate assignment ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID format"
      });
    }

    // Find the assignment
    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Check if the user is authorized to delete this assignment
    if (assignment.created_by.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this assignment"
      });
    }

    // Delete assignment files
    if (assignment.attachment && fs.existsSync(assignment.attachment)) {
      fs.unlinkSync(assignment.attachment);
    }

    if (assignment.document && fs.existsSync(assignment.document)) {
      fs.unlinkSync(assignment.document);
    }

    // Delete assignment record
    await Assignment.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Assignment deleted successfully"
    });
  } catch (error) {
    return handleError(error, res, "Failed to delete assignment");
  }
};