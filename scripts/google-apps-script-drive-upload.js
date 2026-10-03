/**
 * ==============================================================================
 * Boundless Society - Google Apps Script Drive Upload Handler
 * ==============================================================================
 *
 * TARGET STORAGE HIERARCHY FOR STUDENT ID-CARDS:
 * Boundless
 * └── Trips
 *     └── <Trip Name>
 *         └── <Student ID> - <Student Name>
 *             └── Student-ID.<extension>
 *
 * KEY FEATURES:
 * 1. Strict Folder Hierarchy:
 *    - Boundless (root)
 *    - Trips
 *    - <Trip Name>
 *    - <Student ID> - <Student Name>
 *    NO category subfolders ("Student IDs", "Consent Forms", etc.) in the Student ID path.
 *
 * 2. Deterministic File Naming:
 *    - Strictly "Student-ID.<extension>" (e.g., Student-ID.pdf, Student-ID.jpg, Student-ID.png).
 *    - No random strings, timestamps, UIDs, or hashes in filename.
 *
 * 3. Safe Re-upload / Replacement:
 *    - When a student re-uploads their ID card, the old Student-ID file is safely trashed,
 *      ensuring exactly ONE current Student-ID document remains in the student folder.
 *
 * 4. Concurrency & Race-Condition Protection:
 *    - Uses LockService.getScriptLock() (up to 30s) to prevent duplicate folder creation
 *      and conflicting concurrent writes.
 *
 * 5. Multi-Trip Isolation:
 *    - Folders are separated by Trip Name and unique tripId description tag.
 *
 * 6. Non-Student ID Fallback:
 *    - For dynamic form files, stores neatly under Form Files/<Student ID> - <Student Name>/
 *      without disrupting the Student ID architecture.
 *
 * 7. ZERO HASHING:
 *    - Strictly zero hashing of passwords, tokens, filenames, UIDs, or student IDs.
 *
 * ==============================================================================
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open Google Apps Script: https://script.google.com
 * 2. Create a new project named "Boundless Drive Storage"
 * 3. Replace Code.gs with this entire script.
 * 4. Set SCRIPT_SECRET in Script Properties:
 *    - Project Settings (gear icon) > Script Properties > Add script property
 *    - Property: "SCRIPT_SECRET"
 *    - Value: Match the DRIVE_UPLOAD_SECRET from your .env file
 * 5. Click "Deploy" > "New deployment"
 * 6. Select type: "Web app"
 * 7. Description: "Boundless Drive Storage v2"
 * 8. Execute as: "Me"
 * 9. Who has access: "Anyone"
 * 10. Click "Deploy", copy the Web App URL and paste into DRIVE_UPLOAD_URL in your .env
 * ==============================================================================
 */

// Fallback script secret if Script Properties are not configured
var DEFAULT_SECRET = "";

function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = false;

  try {
    // Acquire lock for up to 30 seconds to prevent concurrent folder/file race conditions
    hasLock = lock.tryLock(30000);
    if (!hasLock) {
      return createJsonResponse({
        status: "error",
        message: "Server is currently busy handling another upload. Please retry in a few seconds."
      }, 503);
    }

    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: "error", message: "Empty request payload" }, 400);
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ status: "error", message: "Invalid JSON payload" }, 400);
    }

    // Validate shared secret
    var expectedSecret = getScriptSecret();
    if (expectedSecret && data.secret !== expectedSecret) {
      return createJsonResponse({ status: "error", message: "Unauthorized" }, 401);
    }

    // Validate required file payload
    if (!data.fileBase64 || !data.mimeType) {
      return createJsonResponse({ status: "error", message: "Missing fileBase64 or mimeType" }, 400);
    }

    // Extract student & trip metadata
    var tripName = sanitizeFolderName(data.tripName || "Unassigned Trip");
    var tripId = String(data.tripId || "").trim();
    var uid = String(data.uid || "").trim();
    var studentId = String(data.studentId || "").trim();
    var studentName = String(data.studentName || "").trim();
    var studentEmail = String(data.studentEmail || data.email || "").trim();
    var subFolderType = String(data.subFolderType || "").trim();
    var documentType = String(data.documentType || "").trim();
    var fieldName = String(data.fieldName || "").trim();

    // Determine if this is a Student ID upload
    var isStudentId =
      documentType === "Student ID" ||
      subFolderType === "Student IDs" ||
      fieldName === "Student ID Card Copy";

    // Resolve file extension
    var mimeType = data.mimeType;
    var extension = getExtensionFromMime(mimeType);

    // Determine target file name:
    // Strictly "Student-ID.<extension>" for Student ID cards
    var targetFileName = isStudentId
      ? "Student-ID." + extension
      : sanitizeFolderName(data.fileName || ("file_" + Date.now() + "." + extension));

    // Decode file content
    var decodedBytes;
    try {
      decodedBytes = Utilities.base64Decode(data.fileBase64);
    } catch (b64Err) {
      return createJsonResponse({ status: "error", message: "Invalid base64 encoding" }, 400);
    }

    var blob = Utilities.newBlob(decodedBytes, mimeType, targetFileName);

    // 1. Resolve Boundless root folder
    var rootFolder = getOrCreateRootFolder("Boundless");

    // 2. Resolve Trips container folder: Boundless / Trips
    var tripsContainerFolder = getOrCreateSubFolder(rootFolder, "Trips", "Boundless Trips Root Container");

    // 3. Resolve Trip folder: Boundless / Trips / <Trip Name>
    var tripFolder = getOrCreateTripFolder(tripsContainerFolder, tripName, tripId);

    // 4. Resolve Student folder or generic subfolder
    var destinationFolder;
    if (isStudentId) {
      // Direct student folder under Trip:
      // Boundless / Trips / <Trip Name> / <Student ID> - <Student Name>
      destinationFolder = getOrCreateStudentFolder(tripFolder, studentId, studentName, studentEmail, uid);
    } else {
      // Dynamic form files:
      // Boundless / Trips / <Trip Name> / <SubFolderType> / <Student ID> - <Student Name>
      var categoryFolder = getOrCreateSubFolder(tripFolder, subFolderType || "Form Files", "");
      destinationFolder = getOrCreateStudentFolder(categoryFolder, studentId, studentName, studentEmail, uid);
    }

    // 5. Handle Re-upload / Replacement:
    // For Student ID cards, trash any older Student-ID or legacy upload files
    // so exactly ONE current file remains in the student folder
    if (isStudentId) {
      trashOldStudentIdFiles(destinationFolder, targetFileName);
    }

    // 6. Create the new file in the student folder
    var createdFile = destinationFolder.createFile(blob);

    // 7. Ensure view permissions for links
    try {
      createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (permErr) {
      // In restricted Google Workspace domains, fallback gracefully
      Logger.log("Sharing permission warning: " + permErr.toString());
    }

    var fileId = createdFile.getId();
    var fileUrl = createdFile.getUrl();

    // Standardize URL to standard web preview format
    var canonicalUrl = "https://drive.google.com/file/d/" + fileId + "/view?usp=drivesdk";

    return createJsonResponse({
      status: "success",
      fileId: fileId,
      driveFileId: fileId,
      fileUrl: canonicalUrl,
      driveUrl: canonicalUrl,
      fileName: createdFile.getName(),
      tripName: tripName,
      studentFolder: destinationFolder.getName(),
      uploadedAt: new Date().toISOString()
    }, 200);

  } catch (error) {
    Logger.log("doPost Error: " + error.toString());
    return createJsonResponse({
      status: "error",
      message: error.message || error.toString()
    }, 500);
  } finally {
    if (hasLock) {
      lock.releaseLock();
    }
  }
}

/**
 * Handle GET requests for health check & status inspection
 */
function doGet(e) {
  return createJsonResponse({
    status: "ok",
    service: "Boundless Society Google Drive Storage Web App",
    architecture: "Boundless/Trips/<Trip Name>/<Student ID> - <Student Name>/Student-ID.<ext>",
    version: "2.0.0",
    timestamp: new Date().toISOString()
  }, 200);
}

// ==============================================================================
// FOLDER & FILE MANAGEMENT HELPERS
// ==============================================================================

/**
 * Get or create the top-level "Boundless" root folder in Google Drive.
 */
function getOrCreateRootFolder(name) {
  var folders = DriveApp.getFoldersByName(name);
  while (folders.hasNext()) {
    var f = folders.next();
    if (!f.isTrashed()) {
      return f;
    }
  }
  return DriveApp.createFolder(name);
}

/**
 * Get or create a child folder under a specific parent folder by name.
 */
function getOrCreateSubFolder(parentFolder, name, description) {
  var cleanName = sanitizeFolderName(name);
  var folders = parentFolder.getFoldersByName(cleanName);
  while (folders.hasNext()) {
    var f = folders.next();
    if (!f.isTrashed()) {
      if (description && !f.getDescription()) {
        f.setDescription(description);
      }
      return f;
    }
  }
  var newFolder = parentFolder.createFolder(cleanName);
  if (description) {
    newFolder.setDescription(description);
  }
  return newFolder;
}

/**
 * Get or create a Trip folder under Boundless/Trips.
 * Uses tripId tag in description to match authoritatively even if display name changes.
 */
function getOrCreateTripFolder(tripsContainer, tripName, tripId) {
  var cleanName = sanitizeFolderName(tripName);

  // 1. Check if folder already exists with exact tripName
  var folders = tripsContainer.getFoldersByName(cleanName);
  while (folders.hasNext()) {
    var f = folders.next();
    if (!f.isTrashed()) {
      var desc = f.getDescription() || "";
      if (tripId && desc.indexOf("tripId:") === -1) {
        f.setDescription("tripId:" + tripId);
      }
      return f;
    }
  }

  // 2. If tripId provided, check if folder exists with matching tripId description
  if (tripId) {
    var allFolders = tripsContainer.getFolders();
    while (allFolders.hasNext()) {
      var folder = allFolders.next();
      if (!folder.isTrashed()) {
        var folderDesc = folder.getDescription() || "";
        if (folderDesc.indexOf("tripId:" + tripId) !== -1) {
          // Rename if tripName was updated
          if (folder.getName() !== cleanName) {
            folder.setName(cleanName);
          }
          return folder;
        }
      }
    }
  }

  // 3. Create new Trip folder
  var newTripFolder = tripsContainer.createFolder(cleanName);
  if (tripId) {
    newTripFolder.setDescription("tripId:" + tripId);
  }
  return newTripFolder;
}

/**
 * Get or create a Student folder under the Trip folder.
 * Name format: "<Student ID> - <Student Name>"
 * Example: "23F20001 - Rahul Sharma"
 * Uses uid tag in description to match authoritatively on re-upload.
 */
function getOrCreateStudentFolder(parentFolder, studentId, studentName, studentEmail, uid) {
  // Construct clean folder display name
  var folderDisplayName = "";
  if (studentId && studentName) {
    folderDisplayName = studentId + " - " + studentName;
  } else if (studentId) {
    folderDisplayName = studentId + " - " + (studentEmail || "Student");
  } else if (studentName) {
    folderDisplayName = studentName;
  } else if (studentEmail) {
    folderDisplayName = studentEmail;
  } else {
    folderDisplayName = "Student";
  }

  folderDisplayName = sanitizeFolderName(folderDisplayName);

  // 1. Search by exact name
  var folders = parentFolder.getFoldersByName(folderDisplayName);
  while (folders.hasNext()) {
    var f = folders.next();
    if (!f.isTrashed()) {
      var desc = f.getDescription() || "";
      if (uid && desc.indexOf("uid:") === -1) {
        f.setDescription("uid:" + uid);
      }
      return f;
    }
  }

  // 2. Search by authoritative Firebase Auth uid tag in description
  if (uid) {
    var allFolders = parentFolder.getFolders();
    while (allFolders.hasNext()) {
      var folder = allFolders.next();
      if (!folder.isTrashed()) {
        var folderDesc = folder.getDescription() || "";
        if (folderDesc.indexOf("uid:" + uid) !== -1) {
          // Update display name if roll number or student name was updated
          if (folder.getName() !== folderDisplayName) {
            folder.setName(folderDisplayName);
          }
          return folder;
        }
      }
    }
  }

  // 3. Create new student folder
  var newStudentFolder = parentFolder.createFolder(folderDisplayName);
  if (uid) {
    newStudentFolder.setDescription("uid:" + uid);
  }
  return newStudentFolder;
}

/**
 * Safely move previous Student ID files to Trash on re-upload
 * so that only ONE current Student-ID document remains.
 */
function trashOldStudentIdFiles(folder, newFileName) {
  try {
    var files = folder.getFiles();
    var toTrash = [];

    while (files.hasNext()) {
      var file = files.next();
      if (!file.isTrashed()) {
        var fname = file.getName().toLowerCase();
        // Match Student-ID.* or legacy upload_* files
        if (
          fname.indexOf("student-id") === 0 ||
          fname.indexOf("student_id") === 0 ||
          fname.indexOf("upload_") === 0
        ) {
          toTrash.push(file);
        }
      }
    }

    for (var i = 0; i < toTrash.length; i++) {
      try {
        toTrash[i].setTrashed(true);
      } catch (err) {
        Logger.log("Failed to trash old file: " + err.toString());
      }
    }
  } catch (err) {
    Logger.log("Error in trashOldStudentIdFiles: " + err.toString());
  }
}

/**
 * Helper to derive file extension from MIME type.
 */
function getExtensionFromMime(mime) {
  if (!mime) return "pdf";
  var lower = mime.toLowerCase();
  if (lower.indexOf("pdf") !== -1) return "pdf";
  if (lower.indexOf("jpeg") !== -1 || lower.indexOf("jpg") !== -1) return "jpg";
  if (lower.indexOf("png") !== -1) return "png";
  if (lower.indexOf("word") !== -1 || lower.indexOf("msword") !== -1) return "doc";
  if (lower.indexOf("officedocument") !== -1) return "docx";
  var parts = lower.split("/");
  if (parts.length > 1 && parts[1]) {
    return parts[1].split(";")[0].replace(/[^a-z0-9]/g, "");
  }
  return "pdf";
}

/**
 * Sanitize folder and file names to prevent invalid characters in Google Drive.
 */
function sanitizeFolderName(name) {
  if (!name) return "Untitled";
  return String(name)
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Retrieve shared secret from Script Properties or fallback constant.
 */
function getScriptSecret() {
  try {
    var props = PropertiesService.getScriptProperties();
    var secret = props.getProperty("SCRIPT_SECRET");
    if (secret) return secret;
  } catch (e) {}
  return DEFAULT_SECRET;
}

/**
 * Helper to produce standard JSON HTTP response.
 */
function createJsonResponse(obj, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
