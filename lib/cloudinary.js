import { v2 as cloudinary } from "cloudinary";

// 1. Robust Configuration
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Single Image Upload
export async function uploadImage(imageData, options = {}) {
  const { folder = "uploads" } = options;
  const rawData = typeof imageData === "string" ? imageData : (imageData?.data || "");

  // Detect if the file is a document (PDF, Word, etc.) vs a plain image
  const isDocument =
    rawData.startsWith("data:application/pdf") ||
    rawData.startsWith("data:application/msword") ||
    rawData.startsWith("data:application/vnd.openxmlformats") ||
    rawData.startsWith("data:application/octet-stream");

  const result = await cloudinary.uploader.upload(rawData, {
    folder,
    // Use "raw" for documents so Cloudinary stores them as-is without any conversion
    resource_type: isDocument ? "raw" : "image",
    timeout: 120000,
  });

  return result;
}

// 3. Multiple Images Upload (Returns Array of Cloudinary Upload Results)
export async function uploadImages(images, options = {}) {
  const uploadPromises = images.map((image) => uploadImage(image, options));
  const results = await Promise.all(uploadPromises);
  return results;
}