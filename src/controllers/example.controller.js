// @desc    Get all examples
// @route   GET /api/examples
// @access  Public
exports.getExamples = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: [
        { id: 1, name: 'Example 1' },
        { id: 2, name: 'Example 2' },
      ],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
};

// @desc    Create new example
// @route   POST /api/examples
// @access  Public
exports.createExample = (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a name',
      });
    }

    // In a real app, you would save this to a database
    const newExample = {
      id: Math.floor(Math.random() * 1000),
      name,
    };

    res.status(201).json({
      success: true,
      data: newExample,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
};
