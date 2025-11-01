import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Forecasts from "./pages/Forecasts";
import ChurnAnalysis from "./pages/ChurnAnalysis";
import Inventory from "./pages/Inventory";
import Upload from "./pages/Upload";
import Layout from "./components/Layout";
import "@/App.css";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="forecasts" element={<Forecasts />} />
            <Route path="churn" element={<ChurnAnalysis />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="upload" element={<Upload />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;