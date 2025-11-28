import fs from 'fs';
import path from 'path';

const fileToDelete = path.resolve('scripts/reprocess-mentor-mentee.js');

try {
  if (fs.existsSync(fileToDelete)) {
    fs.unlinkSync(fileToDelete);
    console.log(`Successfully deleted: ${fileToDelete}`);
  } else {
    console.log(`File not found, skipping deletion: ${fileToDelete}`);
  }
} catch (error) {
  console.error(`Error deleting file ${fileToDelete}:`, error);
}
