import { useQuery } from "@tanstack/react-query";
import { fetchCollections, fetchItems, isCogAsset } from "../lib/stac";
import type { StacItem } from "../lib/stac";

export function Sidebar({
  selectedCollectionId,
  onSelectCollection,
  selectedItem,
  onSelectItem,
}: {
  selectedCollectionId: string | null;
  onSelectCollection: (id: string) => void;
  selectedItem: StacItem | null;
  onSelectItem: (item: StacItem) => void;
}) {
  const collectionsQuery = useQuery({
    queryKey: ["collections"],
    queryFn: fetchCollections,
  });

  const itemsQuery = useQuery({
    queryKey: ["items", selectedCollectionId],
    queryFn: () => fetchItems(selectedCollectionId as string),
    enabled: !!selectedCollectionId,
  });

  return (
    <aside
      style={{
        width: 300,
        overflowY: "auto",
        borderRight: "1px solid #ddd",
        padding: 12,
        boxSizing: "border-box",
        background: "#fff",
      }}
    >
      <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>Collections</h2>
      {collectionsQuery.isLoading && <p>Loading…</p>}
      {collectionsQuery.isError && <p>Failed to load collections.</p>}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {collectionsQuery.data?.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => onSelectCollection(c.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "6px 8px",
                margin: "2px 0",
                background: c.id === selectedCollectionId ? "#e0e7ff" : "transparent",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {c.title ?? c.id}
            </button>
          </li>
        ))}
      </ul>

      {selectedCollectionId && (
        <>
          <h2 style={{ fontSize: 16, margin: "16px 0 8px" }}>Items</h2>
          {itemsQuery.isLoading && <p>Loading…</p>}
          {itemsQuery.isError && <p>Failed to load items.</p>}
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {itemsQuery.data?.map((item) => {
              const dataAsset = item.assets["data"];
              const previewable = dataAsset ? isCogAsset(dataAsset) : false;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onSelectItem(item)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 8px",
                      margin: "2px 0",
                      background: item.id === selectedItem?.id ? "#e0e7ff" : "transparent",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    {item.id}
                    {!previewable && (
                      <span style={{ color: "#999", fontSize: 12 }}> (no raster preview)</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </aside>
  );
}
