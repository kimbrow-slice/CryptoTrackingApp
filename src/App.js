import React, { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import Dashboard from "./components/Dashboard";
import { formatData } from "./utils";
import "./styles.css";

const queryClient = new QueryClient();

export default function App() {
  const [currencies, setCurrencies] = useState([]);
  const [pair, setPair] = useState("");
  const [price, setPrice] = useState("0.00");
  const [pastData, setPastData] = useState({});
  const ws = useRef(null);

  let first = useRef(false);
  const url = "https://api.pro.coinbase.com";

  useEffect(() => {
    ws.current = new WebSocket("wss://ws-feed.pro.coinbase.com");

    let pairs = [];

    const apiCall = async () => {
      await fetch(url + "/products")
        .then((res) => res.json())
        .then((data) => (pairs = data));

      let filtered = pairs.filter((pair) => {
        if (pair.quote_currency === "USD") {
          return pair;
        }
      });

      filtered = filtered.sort((a, b) => {
        if (a.base_currency < b.base_currency) {
          return -1;
        }
        if (a.base_currency > b.base_currency) {
          return 1;
        }
        return 0;
      });

      setCurrencies(filtered);

      first.current = true;
    };

    apiCall();
  }, []);

  useEffect(() => {
    if (!first.current) {
      return;
    }

    let msg = {
      type: "subscribe",
      product_ids: [pair],
      channels: ["ticker"],
    };
    let jsonMsg = JSON.stringify(msg);
    ws.current.send(jsonMsg);

    let historicalDataURL = `${url}/products/${pair}/candles?granularity=86400`;
    const fetchHistoricalData = async () => {
      let dataArr = [];
      await fetch(historicalDataURL)
        .then((res) => res.json())
        .then((data) => (dataArr = data));

      let formattedData = formatData(dataArr);
      setPastData(formattedData);
    };

    fetchHistoricalData();

    ws.current.onmessage = (e) => {
      let data = JSON.parse(e.data);
   
      if (data.type !== "ticker") {
        return;
      }

      if (data.product_id === pair) {
        setPrice(data.price);
        console.log("data price" , data.price)
      }
    };
  }, [pair]);

  const handleSelect = (e) => {
    console.log(e)
    let unsubMsg = {
      type: "unsubscribe",
      product_ids: [pair],
      channels: ["ticker"],
    };
    let unsub = JSON.stringify(unsubMsg);

    ws.current.send(unsub);

    setPair(e.target.value);
  };

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <div className="container">
          <h1>Crypto Price Tracker</h1>
          {
            <select name="currency" value={pair} onChange={handleSelect}>
              {currencies.map((cur, idx) => {
                return (
                  <option key={idx} value={cur.id}>
                    {console.log(cur.id)}
                    {cur.display_name}
                  </option>
                );
              })}
            </select>
          }
          <Cards setPair={setPair} pair={pair} currencies={currencies} price={price} handleSelect={handleSelect} />
          <Dashboard price={price} data={pastData} />
        </div>
        {/* cards */}
      
      </QueryClientProvider>
    </>
  );
}

function Cards(props) {
  return (
    <div className="flex-container">
      {console.log(props.currencies)}
      {props.currencies.map((cur, idx) => (
        <div className="cards">
          <p onClick={props.handleSelect} value={cur.id} >{cur.id}</p>
          <p>{props.price}</p>
        </div>
      ))}
    </div>
  );
}
