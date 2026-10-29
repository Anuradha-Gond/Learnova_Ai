/**
 * Semantic-Aware Text Chunking Service
 *
 * Deconstructs normalized document text into coherent, overlapping passages
 * optimized for vector embeddings and document-grounded RAG retrieval.
 *
 * Splitting Hierarchy:
 * 1. Paragraph boundaries (\n\n)
 * 2. Sentence boundaries (.!?)
 * 3. Word boundaries (\s)
 * 4. Character boundaries (emergency fallback for unbroken tokens)
 */

export const CHUNKING_CONFIG = {
  targetChunkSize: 1000,   // ~200-250 words
  maxChunkSize: 1500,      // Hard ceiling per chunk
  minChunkSize: 100,       // Minimum size to prevent stray fragments
  overlap: 150,            // Context overlap between adjacent chunks
};

/**
 * Splits a passage into sentences preserving punctuation.
 *
 * @param {string} text
 * @returns {string[]} Array of sentences
 */
function splitIntoSentences(text) {
  if (!text) return [];

  // Split on sentence-ending punctuation followed by whitespace or end of line
  const matches = text.match(/[^.!?\n]+(?:[.!?\n]+|$)/g);
  if (!matches) {
    return [text];
  }

  return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Splits a large text block into chunks respecting sentence and paragraph boundaries.
 *
 * @param {string} text - Clean normalized text
 * @param {object} [options]
 * @param {number} [options.targetSize] - Target characters per chunk (default 1000)
 * @param {number} [options.maxSize] - Maximum characters per chunk (default 1500)
 * @param {number} [options.overlap] - Character overlap between consecutive chunks (default 150)
 * @param {number|null} [options.pageNumber] - Source page number
 * @param {number} [options.baseOffset] - Global start character offset
 * @returns {Array<{ chunkText: string, startCharOffset: number, endCharOffset: number, pageNumber: number|null, characterCount: number }>}
 */
export function chunkTextBlock(text, options = {}) {
  const targetSize = options.targetSize || CHUNKING_CONFIG.targetChunkSize;
  const maxSize = options.maxSize || CHUNKING_CONFIG.maxChunkSize;
  const overlap = options.overlap || CHUNKING_CONFIG.overlap;
  const pageNumber = options.pageNumber ?? null;
  const baseOffset = options.baseOffset || 0;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return [];
  }

  const trimmed = text.trim();

  // If text is already within target size, return single chunk
  if (trimmed.length <= maxSize) {
    const startCharOffset = baseOffset + text.indexOf(trimmed);
    const endCharOffset = startCharOffset + trimmed.length;

    return [
      {
        chunkText: trimmed,
        startCharOffset,
        endCharOffset,
        pageNumber,
        characterCount: trimmed.length,
      },
    ];
  }

  // 1. Break down into paragraphs
  const rawParagraphs = text.split(/\n\n+/);
  const segments = [];

  for (const para of rawParagraphs) {
    const cleanPara = para.trim();
    if (!cleanPara) continue;

    if (cleanPara.length <= maxSize) {
      segments.push(cleanPara);
    } else {
      // 2. Paragraph is too large: break down into sentences
      const sentences = splitIntoSentences(cleanPara);
      for (const sent of sentences) {
        if (sent.length <= maxSize) {
          segments.push(sent);
        } else {
          // 3. Sentence is exceptionally long: break by words
          const words = sent.split(/\s+/);
          let currentWordChunk = "";

          for (const w of words) {
            if ((currentWordChunk + " " + w).length <= maxSize) {
              currentWordChunk = currentWordChunk ? currentWordChunk + " " + w : w;
            } else {
              if (currentWordChunk) segments.push(currentWordChunk);
              // If a single word itself exceeds maxSize, emergency slice
              if (w.length > maxSize) {
                for (let i = 0; i < w.length; i += maxSize) {
                  segments.push(w.slice(i, i + maxSize));
                }
                currentWordChunk = "";
              } else {
                currentWordChunk = w;
              }
            }
          }
          if (currentWordChunk) {
            segments.push(currentWordChunk);
          }
        }
      }
    }
  }

  // Group segments into target-sized chunks with overlap
  const chunks = [];
  let currentChunk = "";
  let chunkStartIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (!currentChunk) {
      currentChunk = seg;
      chunkStartIndex = text.indexOf(seg, chunkStartIndex);
      if (chunkStartIndex === -1) chunkStartIndex = 0;
    } else if (currentChunk.length + 1 + seg.length <= targetSize) {
      currentChunk += " " + seg;
    } else if (currentChunk.length + 1 + seg.length <= maxSize) {
      currentChunk += " " + seg;
      // Reached near target/max size, emit chunk
      const start = baseOffset + chunkStartIndex;
      const end = start + currentChunk.length;

      chunks.push({
        chunkText: currentChunk,
        startCharOffset: start,
        endCharOffset: end,
        pageNumber,
        characterCount: currentChunk.length,
      });

      // Prepare overlap for next chunk
      const overlapText = getOverlapTail(currentChunk, overlap);
      currentChunk = overlapText;
      chunkStartIndex = chunkStartIndex + (chunks[chunks.length - 1].chunkText.length - overlapText.length);
    } else {
      // Emitting current chunk
      const start = baseOffset + chunkStartIndex;
      const end = start + currentChunk.length;

      chunks.push({
        chunkText: currentChunk,
        startCharOffset: start,
        endCharOffset: end,
        pageNumber,
        characterCount: currentChunk.length,
      });

      const overlapText = getOverlapTail(currentChunk, overlap);
      currentChunk = overlapText ? overlapText + " " + seg : seg;
      chunkStartIndex = text.indexOf(seg, chunkStartIndex);
      if (chunkStartIndex === -1) chunkStartIndex = end;
    }
  }

  // Push remainder
  if (currentChunk && currentChunk.trim().length > 0) {
    const cleanFinal = currentChunk.trim();
    // Avoid creating duplicate chunk if it's identical to the previous chunk's overlap
    if (
      chunks.length === 0 ||
      chunks[chunks.length - 1].chunkText !== cleanFinal
    ) {
      const start = baseOffset + chunkStartIndex;
      const end = start + cleanFinal.length;
      chunks.push({
        chunkText: cleanFinal,
        startCharOffset: start,
        endCharOffset: end,
        pageNumber,
        characterCount: cleanFinal.length,
      });
    }
  }

  return chunks;
}

/**
 * Extracts a tail string of approximately `overlapSize` characters,
 * cleanly breaking at a word boundary.
 *
 * @param {string} text
 * @param {number} overlapSize
 * @returns {string} Overlapping tail
 */
function getOverlapTail(text, overlapSize) {
  if (!text || text.length <= overlapSize) {
    return "";
  }

  const slice = text.slice(-overlapSize).trim();
  const firstSpace = slice.indexOf(" ");

  if (firstSpace > 0 && firstSpace < slice.length - 10) {
    return slice.slice(firstSpace + 1).trim();
  }

  return slice;
}

/**
 * Creates semantic chunks across an entire document.
 * If page-level text is provided, attributes source page numbers accurately.
 *
 * @param {object} params
 * @param {string} params.text - Full normalized document text
 * @param {Array<{ pageNumber: number, text: string }>} [params.pages] - Page-level text array
 * @param {object} [params.options] - Sizing overrides
 * @returns {Array<{ chunkIndex: number, chunkText: string, startCharOffset: number, endCharOffset: number, pageNumber: number|null, characterCount: number }>}
 */
export function createDocumentChunks({ text, pages = [], options = {} }) {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return [];
  }

  let rawChunks = [];

  // If page metadata exists with multiple pages, chunk per page
  if (Array.isArray(pages) && pages.length > 0) {
    let globalOffset = 0;

    for (const page of pages) {
      const pageText = page.text || "";
      if (pageText.trim().length === 0) continue;

      const pageChunks = chunkTextBlock(pageText, {
        ...options,
        pageNumber: page.pageNumber || null,
        baseOffset: globalOffset,
      });

      rawChunks.push(...pageChunks);
      globalOffset += pageText.length + 2; // +2 for paragraph spacer
    }
  } else {
    // Single continuous text
    rawChunks = chunkTextBlock(text, options);
  }

  // Ensure deterministic chunk numbering and no empty chunks
  const validatedChunks = rawChunks
    .filter((c) => c && c.chunkText && c.chunkText.trim().length > 0)
    .map((chunk, index) => ({
      chunkIndex: index,
      chunkText: chunk.chunkText.trim(),
      startCharOffset: chunk.startCharOffset,
      endCharOffset: chunk.endCharOffset,
      pageNumber: chunk.pageNumber || null,
      characterCount: chunk.chunkText.trim().length,
    }));

  return validatedChunks;
}
