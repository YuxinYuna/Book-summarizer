const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { LanguageServiceClient } = require('@google-cloud/language');
const languageClient = new LanguageServiceClient();

const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://3.133.137.82:3000'
}));


// Mock function to extract keywords 
function extractKeywords(text) {

  return text.split(/\s+/).slice(0, 5);
}

// Enhanced helper function for more detailed recommendations
async function analyzeTextForRecommendation(book) {
  try {
    const description = book.volumeInfo.description || '';
    let recommendationReason = 'This book';

    // Include categories in the recommendation
    if (book.volumeInfo.categories) {
      recommendationReason += ` spans across categories such as ${book.volumeInfo.categories.join(", ")},`;
    }

    // Extract keywords from the description
    if (description) {
      const keywords = extractKeywords(description);
      recommendationReason += ` touching on themes like ${keywords.join(", ")},`;
    }

    // Perform entity analysis
    const [entityResult] = await languageClient.analyzeEntities({
      document: { content: description, type: 'PLAIN_TEXT' },
    });

    const entities = entityResult.entities;

    // If entities were found, include them in the recommendation
    if (entities.length > 0) {
      const relevantEntities = entities.slice(0, 3).map(entity => entity.name).join(', ');
      recommendationReason += ` and delving into key concepts such as ${relevantEntities}.`;
    }

    recommendationReason += ' It offers a unique perspective that could be just what you’re looking for.';

    // Add a teaser from the description
    if (description) {
      const teaser = description.length > 150 ? `${description.slice(0, 150)}...` : description;
      recommendationReason += ` Have a glimpse: "${teaser}"`;
    }

    recommendationReason += ' Why not give it a read and see where it takes you?';

    return recommendationReason;
  } catch (error) {
    console.error("Failed to analyze text for recommendation:", error);
    return "There's something intriguing about this book that's hard to pin down. It might surprise you!";
  }
}


app.get('/search/:query', async (req, res) => {
  const { query } = req.params;
  const { startIndex = 0, maxResults = 10 } = req.query; // Default values if not provided


  if (!query) {
    return res.json([]); // Return an empty array if query is empty
  }

  try {
    // Encode the query for use in a URL
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes`, {
      params: {
        q: encodeURIComponent(query),
        startIndex: parseInt(startIndex, 10),
        maxResults: parseInt(maxResults, 10),
        // Add any other parameters you need here
      }
    });
    // Check if items are found
    if (!response.data.items || response.data.items.length === 0) {
      return res.json([]); // Return an empty array if no books are found
    }

    const books = await Promise.all(response.data.items.map(async (book) => {
      const description = book.volumeInfo.description || 'No description available.';
      const recommendation = await analyzeTextForRecommendation(book);
      return {
        title: book.volumeInfo.title,
        authors: book.volumeInfo.authors ? book.volumeInfo.authors.join(", ") : "Unknown Author",
        description: description,
        recommendation: recommendation,
        link: book.volumeInfo.infoLink,
        image: book.volumeInfo.imageLinks.thumbnail,
      };
    }));
    res.json(books);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data from Google Books');
  }
});

const port = 3001; 
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
