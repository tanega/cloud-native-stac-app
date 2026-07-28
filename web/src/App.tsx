import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { MapView } from "./components/MapView";
import type { StacItem } from "./lib/stac";

function App() {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<StacItem | null>(null);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      <Sidebar
        selectedCollectionId={selectedCollectionId}
        onSelectCollection={(id) => {
          setSelectedCollectionId(id);
          setSelectedItem(null);
        }}
        selectedItem={selectedItem}
        onSelectItem={setSelectedItem}
      />
      <main style={{ position: "relative", flex: 1 }}>
        <MapView selectedItem={selectedItem} />
      </main>
    </div>
  );
}

export default App;
