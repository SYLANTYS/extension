import React, { useEffect, useState, useRef } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  CategoryScale
);

interface ChartComponentProps {
  contractSymbol: string;
}

interface ChartDataPoint {
  time: string;
  date: string;
  close: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
}

const ranges = [
  { label: "1D", range: "1d", interval: "1m" },
  { label: "1M", range: "1mo", interval: "1d" },
  { label: "6M", range: "6mo", interval: "1d" },
  { label: "YTD", range: "ytd", interval: "1d" },
  { label: "1Y", range: "1y", interval: "1d" },
  { label: "5Y", range: "5y", interval: "1wk" },
  { label: "All", range: "max", interval: "1mo" },
];

const interpolateNulls = (data: (number | null)[]): number[] => {
  const result = [...data];
  let start = 0;
  while (start < result.length) {
    if (result[start] === null) {
      let end = start + 1;
      while (end < result.length && result[end] === null) {
        end++;
      }
      const startValue = result[start - 1];
      const endValue = result[end];
      if (startValue !== null && endValue !== null) {
        const step = (endValue - startValue) / (end - start + 1);
        for (let i = start; i < end; i++) {
          result[i] = startValue + step * (i - start + 1);
        }
      }
      start = end;
    } else {
      start++;
    }
  }
  return result as number[];
};

const ChartComponent: React.FC<ChartComponentProps> = ({ contractSymbol }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<{
    range: string;
    interval: string;
  }>({ range: "1d", interval: "1m" });
  const chartRef = useRef<HTMLDivElement>(null);
  const [previousClose, setPreviousClose] = useState<number | null>(null);

  useEffect(() => {
    fetchChartData();
    if (contractSymbol) {
      fetchChartData();
    }
  }, [contractSymbol, selectedRange]);

  // Separate useEffect for scrolling when chartData is updated
  useEffect(() => {
    if (chartData && chartRef.current) {
      chartRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chartData]);

  const fetchChartData = async () => {
    try {
      setError(null);
      const { range, interval } = selectedRange;
      const response = await fetch(
        `https://yfapi.net/v8/finance/chart/${contractSymbol}?range=${range}&region=US&interval=${interval}&lang=en`,
        {
          headers: {
            accept: "application/json",
            "X-API-KEY": process.env.REACT_APP_YAHOO_FINANCE_API_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();
      const timestamps: number[] = data.chart.result[0].timestamp;
      const closePrices: (number | null)[] =
        data.chart.result[0].indicators.quote[0].close;
      const openPrices: (number | null)[] =
        data.chart.result[0].indicators.quote[0].open;
      const highPrices: (number | null)[] =
        data.chart.result[0].indicators.quote[0].high;
      const lowPrices: (number | null)[] =
        data.chart.result[0].indicators.quote[0].low;
      const volumes: (number | null)[] =
        data.chart.result[0].indicators.quote[0].volume;
      setPreviousClose(data.chart.result[0].meta.chartPreviousClose);

      // Interpolate null values
      const interpolatedClosePrices = interpolateNulls(closePrices);

      // Prepare filtered data with labels showing "N/A" for null values
      const filteredData: ChartDataPoint[] = timestamps.map(
        (timestamp: number, index: number) => ({
          time: new Date(timestamp * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          date: new Date(timestamp * 1000).toLocaleDateString(),
          close: closePrices[index],
          open: openPrices[index],
          high: highPrices[index],
          low: lowPrices[index],
          volume: volumes[index],
        })
      );

      // Determine the border color based on the start and end closing prices
      let borderColor = "rgba(75,192,192,1)"; // Default color
      if (interpolatedClosePrices.length > 0) {
        const startClose = interpolatedClosePrices[0];
        const endClose =
          interpolatedClosePrices[interpolatedClosePrices.length - 1];
        borderColor =
          endClose > startClose ? "rgba(0, 255, 0, 1)" : "rgba(255, 0, 0, 1)";
      }

      const formattedData = {
        labels: filteredData.map((point) => point.time),
        datasets: [
          {
            label: "Close Price",
            data: interpolatedClosePrices,
            borderColor: borderColor,
            backgroundColor: "rgba(75,192,192,0.2)",
            fill: false,
            pointRadius: 1,
          },
        ],
      };

      setChartData({
        data: formattedData,
        info: filteredData,
      });
    } catch (err) {
      setError("failed");
    }
  };

  return (
    <div className="chart-container bg-gray-900 p-4 rounded-lg" ref={chartRef}>
      <div className="flex justify-between">
        <div className="flex justify-center mb-2">
          {ranges.map((r) => (
            <button
              key={r.label}
              onClick={() =>
                setSelectedRange({ range: r.range, interval: r.interval })
              }
              className={`px-2 py-1 m-1 text-xs border rounded ${
                selectedRange.range === r.range
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 text-white"
              } hover:bg-gray-600`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <h2 className="text-2xl font-bold text-white">{contractSymbol}</h2>
      </div>
      {error || (chartData && chartData.info && chartData.info.length <= 1) ? (
        <p className="text-red-500 text-lg font-bold">
          Failed to fetch chart data / No info at this date
        </p>
      ) : chartData ? (
        <div style={{ position: "relative", height: "100%" }}>
          {selectedRange.range === "1d" ? (
            <p className="absolute top-0 left-7 m-2 text-white">
              Previous Close: <b>{previousClose?.toFixed(2)}</b>
            </p>
          ) : (
            ""
          )}
          <ArrowPathIcon
            onClick={fetchChartData}
            className="absolute top-0 right-3 p-1 size-7 bg-gray-700 text-white cursor-pointer rounded-full transform transition-transform duration-500 hover:rotate-180"
          />
          <Line
            data={chartData.data}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                mode: "index", // This enables the effect of matching the x-coordinate with the closest point on the graph
                intersect: false, // This allows the tooltip to appear when hovering near a point
              },
              scales: {
                x: {
                  ticks: {
                    maxTicksLimit: 10, // Limit the number of ticks on the x-axis
                    callback: function (_, index: number) {
                      const point = chartData.info[index];
                      if (!point) return "";
                      const range = selectedRange.range;
                      if (
                        range === "1mo" ||
                        range === "6mo" ||
                        range === "ytd"
                      ) {
                        return new Date(point.date).toLocaleDateString([], {
                          month: "2-digit",
                          day: "2-digit",
                        });
                      } else if (
                        range === "1y" ||
                        range === "5y" ||
                        range === "max"
                      ) {
                        return new Date(point.date).toLocaleDateString([], {
                          month: "2-digit",
                          day: "2-digit",
                          year: "2-digit",
                        });
                      } else {
                        return point.time;
                      }
                    },
                  },
                  grid: {
                    color: "#D3D3D350", // Change the color of y-axis grid lines to light gray
                  },
                },
                y: {
                  beginAtZero: false,
                  ticks: {
                    callback: function (value: any) {
                      return parseFloat(value).toFixed(2); // Ensure y-axis values are formatted correctly
                    },
                  },
                  grid: {
                    color: "#D3D3D350", // Change the color of y-axis grid lines to light gray
                  },
                },
              },
              plugins: {
                tooltip: {
                  callbacks: {
                    title: function (tooltipItems: any) {
                      // Return the date as the title
                      const dataIndex = tooltipItems[0].dataIndex;
                      const point = chartData.info[dataIndex];
                      if (selectedRange.range === "1d") {
                        return `${point.date} ${point.time}`;
                      } else {
                        return point.date;
                      }
                    },
                    label: function (tooltipItem: any) {
                      const dataIndex = tooltipItem.dataIndex;
                      const point = chartData.info[dataIndex];
                      return [
                        `Close: ${
                          point.close !== null ? point.close.toFixed(2) : "N/A"
                        }`,
                        `Open: ${
                          point.open !== null ? point.open.toFixed(2) : "N/A"
                        }`,
                        `High: ${
                          point.high !== null ? point.high.toFixed(2) : "N/A"
                        }`,
                        `Low: ${
                          point.low !== null ? point.low.toFixed(2) : "N/A"
                        }`,
                        `Volume: ${
                          point.volume !== null ? point.volume : "N/A"
                        }`,
                      ];
                    },
                  },
                },
              },
            }}
            height={350} // Set the fixed height for the chart
          />
        </div>
      ) : (
        <p className="text-white">Loading...</p>
      )}
    </div>
  );
};

export default ChartComponent;
