const apiKey = "";
const googleUrl = new URL(window.location.href);
const search = googleUrl.search;
const searchParam = new URLSearchParams(search);
const q = searchParam.get('q');
const tickerList = [
  'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'GOOG', 'META', 'TSLA', 'V', 'JPM', 'JNJ',
  'WMT', 'PG', 'NVDA', 'DIS', 'MA', 'HD', 'VZ', 'PYPL', 'ADBE', 'NFLX',
  'INTC', 'CMCSA', 'PFE', 'T', 'KO', 'MRK', 'PEP', 'ABBV', 'XOM', 'CSCO',
  'ABT', 'COST', 'AVGO', 'ACN', 'QCOM', 'MDT', 'DHR', 'LLY', 'BMY', 'NEE',
  'TXN', 'PM', 'HON', 'UNH', 'MCD', 'NKE', 'WBA', 'IBM', 'BA', 'GE', 'CAT',
  'MMM', 'SPY', 'IVV', 'VOO', 'VTI', 'VEA', 'VWO', 'BND', 'AGG', 'LQD', 'HYG',
  'HOOD', 'GME', 'AMD', 'AMC'
];

if (q && tickerList.map(ticker => ticker.toLowerCase()).includes(q.toLowerCase())) {

  chrome.runtime.sendMessage(
    {
      type: "FETCH_DATA",
      prompt: q,
      apiKey: apiKey
    },
    response => {
      if (response.result) {
        // Send the result to the React app and store in chrome.storage
        chrome.storage.local.set(response.result, () => {
          chrome.runtime.sendMessage({ type: "DISPLAY_DATA", data: response.result });
        });
      } else {
        console.error(response.error);
      }
    }
  );
} else {
  console.error('Query parameter "q" not found or not in ticker list.');
}
