// src/components/Chart.jsx
import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, 
         XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Chart component for visualizing spreadsheet data
 */
function Chart({ type = 'bar', data, options = {}, onClose }) {
  const [chartData, setChartData] = useState([]);
  const [chartOptions, setChartOptions] = useState({});
  const chartRef = useRef(null);
  
  // Colors for chart series
  const COLORS = [
    '#1a73e8', '#ea4335', '#34a853', '#fbbc04', 
    '#ff6d01', '#46bdc6', '#7baaf7', '#f07b72',
    '#33b679', '#fdd663', '#f8986e', '#80c1ca'
  ];
  
  // Process chart data on mount and when data changes
  useEffect(() => {
    if (!data || !data.labels || !data.datasets) {
      setChartData([]);
      return;
    }
    
    // Format data for Recharts
    const formattedData = data.labels.map((label, index) => {
      const item = { name: label };
      
      // Add data from each dataset
      data.datasets.forEach((dataset, datasetIndex) => {
        item[dataset.label || `Series ${datasetIndex + 1}`] = dataset.data[index] || 0;
      });
      
      return item;
    });
    
    setChartData(formattedData);
    
    // Process chart options
    setChartOptions({
      width: options.width || 600,
      height: options.height || 400,
      title: options.title || '',
      ...options
    });
  }, [data, options]);
  
  // Render appropriate chart based on type
  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return <div className="chart-empty">No data to display</div>;
    }
    
    // Get data keys (excluding 'name')
    const dataKeys = Object.keys(chartData[0]).filter(key => key !== 'name');
    
    switch (type.toLowerCase()) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Line 
                  key={key}
                  type="monotone" 
                  dataKey={key} 
                  stroke={COLORS[index % COLORS.length]} 
                  activeDot={{ r: 8 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Bar 
                  key={key}
                  dataKey={key} 
                  fill={COLORS[index % COLORS.length]} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        // Flatten data for pie chart (takes only the first dataset)
        const pieData = chartData.map((item, index) => ({
          name: item.name,
          value: item[dataKeys[0]] || 0,
          fill: COLORS[index % COLORS.length]
        }));
        
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              />
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
        
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Area 
                  key={key}
                  type="monotone" 
                  dataKey={key} 
                  stackId="1"
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
        
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Bar 
                  key={key}
                  dataKey={key} 
                  fill={COLORS[index % COLORS.length]} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };
  
  return (
    <div className="chart-container" ref={chartRef}>
      <div className="chart-header">
        <h3 className="chart-title">{chartOptions.title || 'Chart'}</h3>
        <button className="chart-close-btn" onClick={onClose}>×</button>
      </div>
      <div className="chart-content" style={{ height: chartOptions.height || 400 }}>
        {renderChart()}
      </div>
    </div>
  );
}

export default Chart;