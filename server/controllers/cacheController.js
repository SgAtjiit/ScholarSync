import ExtractionCache from '../models/ExtractionCache.js';

/**
 * Get cached extraction for a file
 * GET /api/cache/extraction/:fileId
 */
export const getCachedExtraction = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.query;

    if (!userId || !fileId) {
      return res.status(400).json({ error: 'userId and fileId are required' });
    }

    const cache = await ExtractionCache.findOne({ userId, fileId });
    
    if (!cache) {
      return res.status(404).json({ cached: false, message: 'No cache found' });
    }

    // Update last accessed time
    cache.lastAccessedAt = new Date();
    await cache.save();

    res.json({
      cached: true,
      data: {
        extractedContent: cache.extractedContent,
        generatedContent: cache.generatedContent,
        extractedAt: cache.extractedAt,
        fileName: cache.fileName
      }
    });
  } catch (error) {
    console.error('Get cache error:', error);
    res.status(500).json({ error: 'Failed to retrieve cache' });
  }
};

/**
 * Save extracted content to cache
 * POST /api/cache/extraction
 */
export const saveExtraction = async (req, res) => {
  try {
    const { userId, fileId, fileName, assignmentId, extractedContent } = req.body;

    if (!userId || !fileId || !extractedContent) {
      return res.status(400).json({ error: 'userId, fileId, and extractedContent are required' });
    }

    // Upsert - create or update
    const cache = await ExtractionCache.findOneAndUpdate(
      { userId, fileId },
      {
        userId,
        fileId,
        fileName: fileName || 'Unknown',
        assignmentId,
        extractedContent,
        extractedAt: new Date(),
        lastAccessedAt: new Date(),
        $inc: { version: 1 }
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      cacheId: cache._id,
      message: 'Extraction cached successfully'
    });
  } catch (error) {
    console.error('Save cache error:', error);
    res.status(500).json({ error: 'Failed to save cache' });
  }
};

/**
 * Save generated content (quiz, flashcards, etc.) to cache
 * PATCH /api/cache/extraction/:fileId/generated
 */
export const saveGeneratedContent = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, mode, content } = req.body;

    if (!userId || !fileId || !mode || !content) {
      return res.status(400).json({ error: 'userId, fileId, mode, and content are required' });
    }

    const validModes = ['quiz', 'flashcards', 'explain', 'draft'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({ error: `Invalid mode. Must be one of: ${validModes.join(', ')}` });
    }

    const updateField = `generatedContent.${mode}`;
    
    const cache = await ExtractionCache.findOneAndUpdate(
      { userId, fileId },
      {
        $set: { [updateField]: content },
        lastAccessedAt: new Date()
      },
      { new: true }
    );

    if (!cache) {
      return res.status(404).json({ error: 'Cache not found. Extract document first.' });
    }

    res.json({
      success: true,
      message: `${mode} cached successfully`
    });
  } catch (error) {
    console.error('Save generated content error:', error);
    res.status(500).json({ error: 'Failed to save generated content' });
  }
};

/**
 * Clear cache for a specific file or all files for a user
 * DELETE /api/cache/extraction/:fileId
 */
export const clearCache = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, mode } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // If mode is specified, only clear that generated content
    if (mode && mode !== 'all') {
      const validModes = ['quiz', 'flashcards', 'explain', 'draft', 'extraction'];
      if (!validModes.includes(mode)) {
        return res.status(400).json({ error: `Invalid mode. Must be one of: ${validModes.join(', ')}` });
      }

      if (mode === 'extraction') {
        // Clear entire cache entry
        await ExtractionCache.deleteOne({ userId, fileId });
        return res.json({ success: true, message: 'Extraction cache cleared' });
      }

      // Clear only specific generated content
      const updateField = `generatedContent.${mode}`;
      await ExtractionCache.updateOne(
        { userId, fileId },
        { $unset: { [updateField]: 1 } }
      );
      return res.json({ success: true, message: `${mode} cache cleared` });
    }

    // Clear everything for this file
    if (fileId && fileId !== 'all') {
      await ExtractionCache.deleteOne({ userId, fileId });
      return res.json({ success: true, message: 'File cache cleared' });
    }

    // Clear all caches for user
    const result = await ExtractionCache.deleteMany({ userId });
    res.json({ 
      success: true, 
      message: `Cleared ${result.deletedCount} cached extractions` 
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
};

/**
 * Get cache stats for a user
 * GET /api/cache/stats
 */
export const getCacheStats = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const caches = await ExtractionCache.find({ userId }).select('fileName fileId extractedAt generatedContent');
    
    const stats = {
      totalCachedFiles: caches.length,
      files: caches.map(c => ({
        fileId: c.fileId,
        fileName: c.fileName,
        extractedAt: c.extractedAt,
        hasQuiz: !!c.generatedContent?.quiz,
        hasFlashcards: !!c.generatedContent?.flashcards,
        hasExplain: !!c.generatedContent?.explain,
        hasDraft: !!c.generatedContent?.draft
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('Get cache stats error:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
};
