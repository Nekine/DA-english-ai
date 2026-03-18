import React, { useEffect, useState } from 'react';
import statisticsService, { SystemStatistics } from '@/services/statisticsService';

const TestStatistics = () => {
  const [data, setData] = useState<SystemStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching statistics...');
        const result = await statisticsService.getSystemStatistics();
        console.log('Statistics received:', result);
        setData(result);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Test Statistics API</h1>
      
      {loading && <p>Loading...</p>}
      
      {error && (
        <div style={{ color: 'red', padding: '10px', border: '1px solid red' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {data && (
        <div style={{ backgroundColor: '#f0f0f0', padding: '10px', marginTop: '10px' }}>
          <h2>Data received:</h2>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h3>API Endpoint:</h3>
        <p>/api/Statistics</p>
        
        <h3>Expected Response:</h3>
        <pre>{JSON.stringify({
          TotalUsers: 4,
          TotalTests: 2,
          TotalExercises: 3,
          TotalCompletions: 4
        }, null, 2)}</pre>
      </div>
    </div>
  );
};

export default TestStatistics;
