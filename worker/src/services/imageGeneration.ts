/**
 * Image Generation Service - Gemini Imagen
 * Generates scene illustrations for story segments
 * Mirrors the structure of elevenlabs.ts for consistency
 */

import type { Env } from '../types/env';
import { ImageGenerationError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('Image Generation Service');

// Using Imagen 3.0 Generate 002 (fast variant) with :predict endpoint
// Note: imagen-4.0-fast-generate-001 is also available but may have issues with complex prompts
const IMAGEN_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict';

/**
 * Generate image with Gemini Imagen
 * Returns image as ArrayBuffer (PNG format)
 * Mirrors generateTTS() structure from elevenlabs.ts
 */
export async function generateImage(
  segmentText: string,
  env: Env,
  maxRetries = 1
): Promise<ArrayBuffer> {
  // Feature flag check (like DISABLE_TTS)
  if (env.DISABLE_IMAGES === 'true') {
    logger.info('Image generation disabled - returning mock placeholder image');
    // Return a simple 100x100 light purple PNG placeholder for testing
    // This is a minimal PNG with a solid color background
    const placeholderPNG = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x64, // 100x100 dimensions
      0x08, 0x02, 0x00, 0x00, 0x00, 0xff, 0x80, 0x02,
      0x03, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x78, 0x9c, 0x62, 0xbd, 0xb4, 0xf5, 0x0f, // Light purple color data
      0x00, 0x00, 0xff, 0xff, 0x03, 0x00, 0x05, 0xfe,
      0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00,
      0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, // IEND chunk
      0x60, 0x82,
    ]);
    return placeholderPNG.buffer;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(
        `Generating image (attempt ${attempt + 1}/${maxRetries + 1})`,
        { textLength: segmentText.length }
      );

      // Step 1: Create image prompt from story text
      const imagePrompt = createImagePrompt(segmentText);

      // Step 2: Call Imagen API
      const response = await fetch(`${IMAGEN_API_URL}?key=${env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: imagePrompt,
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: env.IMAGEN_ASPECT_RATIO || '4:3',
            safetyFilterLevel: 'block_most',
            personGeneration: 'allow_all',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ImageGenerationError(`API returned ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as any;

      // Check for safety filter blocks
      if (data.predictions?.[0]?.safetyAttributes) {
        const blocked = Object.values(data.predictions[0].safetyAttributes).some(
          (attr: any) => attr === 'BLOCKED'
        );
        if (blocked) {
          throw new ImageGenerationError('Image blocked by safety filter');
        }
      }

      // Extract base64 image
      const base64Image = data.predictions?.[0]?.bytesBase64Encoded;

      if (!base64Image) {
        throw new ImageGenerationError('No image data in response');
      }

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Image);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      logger.info('Image generated successfully', {
        imageSize: bytes.byteLength,
      });

      return bytes.buffer;
    } catch (error) {
      if (attempt < maxRetries) {
        logger.warn(`Image generation failed (attempt ${attempt + 1}), retrying...`, error);
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        logger.error('Image generation failed after retries', error);
        throw error instanceof ImageGenerationError
          ? error
          : new ImageGenerationError(`Failed after ${maxRetries + 1} attempts: ${error}`);
      }
    }
  }

  throw new ImageGenerationError('Unexpected error in retry loop');
}

/**
 * Create child-friendly image prompt from story text
 * Simple transformation - no API call needed
 */
function createImagePrompt(segmentText: string): string {
  // Create a detailed, child-friendly prompt for Imagen
  // Note: negativePrompt is no longer supported, so we emphasize what NOT to include in the main prompt
  return `Create a warm, child-friendly watercolor illustration depicting this scene: ${segmentText}.

Style: Soft pastel colors, whimsical children's book illustration, gentle and inviting atmosphere, storybook art style.
Artistic style: Digital watercolor painting with soft edges, warm lighting, dreamy quality, reminiscent of classic children's literature.

IMPORTANT REQUIREMENTS:
- NO text, words, letters, watermarks, or signatures in the image
- Image only, pure illustration
- Child-safe and wholesome content
- Clear, focused composition without blur or distortion

Suitable for children aged 4-12.`;
}

/**
 * Validate image generation requirements
 * Mirrors validateTTSInput() from elevenlabs.ts
 */
export function validateImageInput(text: string): void {
  if (!text || text.trim().length === 0) {
    throw new ImageGenerationError('Text cannot be empty');
  }

  if (text.length > 5000) {
    throw new ImageGenerationError('Text too long (max 5000 characters)');
  }
}
