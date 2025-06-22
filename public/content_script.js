//DIST FILE: npm run build

const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
const googleUrl = new URL(window.location.href);
const search = googleUrl.search;
const searchParam = new URLSearchParams(search);
const q = searchParam.get("q");
const tickerList = ["GOOGL"];

if (
  q &&
  /^[a-zA-Z]+$/.test(q) &&
  (q.length <= 4 ||
    tickerList.map((ticker) => ticker.toLowerCase()).includes(q.toLowerCase()))
) {
  chrome.runtime.sendMessage(
    {
      type: "FETCH_DATA",
      prompt: q,
      apiKey: apiKey,
    },
    (response) => {
      if (response.result) {
        // Send the result to the React app and store in chrome.storage
        chrome.storage.local.set(response.result, () => {
          chrome.runtime.sendMessage({
            type: "DISPLAY_DATA",
            data: response.result,
          });
        });
      } else {
        console.error(response.error);
      }
    }
  );
} else {
  console.error('Query parameter "q" not found or not in ticker list.');
}
