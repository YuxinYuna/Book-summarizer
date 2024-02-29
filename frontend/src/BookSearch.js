import React, { useState,useEffect } from 'react';
import axios from 'axios';
import { Input, List,Button,Spin} from 'antd';
const { Search } = Input;
export const BookSearch = () => {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startIndex, setStartIndex] = useState(0); // State to keep track of the current index
  const [hasMore, setHasMore] = useState(true);
  
  // Function to save state to sessionStorage
  const saveStateToSessionStorage = () => {
    sessionStorage.setItem('books', JSON.stringify(books));
    sessionStorage.setItem('query', query);
    sessionStorage.setItem('startIndex', JSON.stringify(startIndex));
  };
  

  const fetchBooks = async (loadMore = false) => {
    // Clear books if query is empty and not loading more
    if (!query.trim() && !loadMore) {
      setBooks([]);
      setStartIndex(0);
      sessionStorage.removeItem('books');
      sessionStorage.removeItem('query');
      sessionStorage.removeItem('startIndex');
      return;
    }
      // If not loading more (new search), reset the states
    if (!loadMore) {
      setBooks([]);
      setStartIndex(0);
      setHasMore(true);
    }
        // If there are no more books to load, just return
    if (loadMore && !hasMore) {
      return;
    }

    setIsLoading(true);
    // Calculate the next startIndex based on whether it's a new search or loading more results
    const nextStartIndex = loadMore ? startIndex : 0;
  
    try {
      const response = await axios.get(`http://localhost:3001/search/${query}`, {
        params: {
          startIndex: nextStartIndex,
          maxResults: 10,
        }
      });
      console.log(response.data)
  
      // Check if we're loading more results or if this is a new search
      if (loadMore) {
        // Concatenate the new results if we're loading more
        setBooks(prevBooks => [...prevBooks, ...response.data]);
        // If no new books were fetched, we've reached the end of the list
        setHasMore(response.data.length > 0);
      } else {
        // Set the new results if this is a new search
        setBooks(response.data);
      }
  
      // If there are no results, and it's not a 'load more' action, reset startIndex
      if (response.data.length === 0 && !loadMore) {
        setStartIndex(0);
      } else {
        // Update startIndex to fetch the next set of results
        setStartIndex(nextStartIndex + response.data.length);
      }
      console.log(startIndex)
      console.log(nextStartIndex)
      saveStateToSessionStorage()


    } catch (error) {
      console.error("Failed to fetch books:", error);
      setHasMore(false);  // Assume no more results on error
      setBooks([]);
      setStartIndex(0);
    }finally{
      setIsLoading(false);
    }

  };
  // Effect to rehydrate state from sessionStorage on mount
  useEffect(() => {
    const savedBooks = sessionStorage.getItem('books');
    const savedQuery = sessionStorage.getItem('query');
    const savedStartIndex = sessionStorage.getItem('startIndex');

    if (savedBooks) {
      setBooks(JSON.parse(savedBooks));
    }
    if (savedQuery) {
      setQuery(savedQuery);
    }
    if (savedStartIndex) {
      setStartIndex(JSON.parse(savedStartIndex));

    }
  }, []);

  const renderLoadMoreButton = () => {
    return (
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        {isLoading ? (
          <Spin size="large" />
        ) : hasMore ? (
          <Button onClick={() => fetchBooks(true)}>Show More Results</Button>
        ) : (
          <div>No more results</div>
        )}
      </div>
    );
  };

  return (
    <div style={{ width: '60%', margin: 'auto', paddingTop: '50px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Book Search Tool</h1>
        <Search 
          placeholder="input search text" 
          allowClear 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={() => fetchBooks(false)}
        />
      </div>
      <List
        itemLayout="vertical"
        size="large"
        dataSource={books}
        renderItem={item => (
          <List.Item
            key={item.key}
            extra={<img width={150} alt="book cover" src={item.image} />}
          >
            <List.Item.Meta
              title={<a href={item.link}>{item.title}</a>}
              description={item.authors}
            />
            <p>{item.description}</p>
            <p><b>Recommendation:</b> {item.recommendation}</p>
          </List.Item>
        )}
        footer={renderLoadMoreButton()}  // Add the renderLoadMoreButton call here to render it as a footer
      />

    </div>
  );
  

  
};
