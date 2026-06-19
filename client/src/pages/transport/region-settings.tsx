import { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronUp, ChevronDown, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubRegion {
  id: string;
  name: string;
  order: number;
}

interface RegionData {
  [key: string]: SubRegion[];
}

export default function RegionSettings() {
  // Fixed top-level regions
  const topLevelRegions = [
    { id: "daegu", name: "대구" },
    { id: "seoul", name: "서울" },
    { id: "gyeonggi", name: "경기" },
    { id: "busan", name: "부산" }
  ];

  const [selectedRegion, setSelectedRegion] = useState("daegu");

  // Mock regional data with sub-regions
  const [regionData, setRegionData] = useState<RegionData>({
    daegu: [
      { id: "daegu-buk", name: "북구", order: 1 },
      { id: "daegu-jung", name: "중구", order: 2 },
      { id: "daegu-dong", name: "동구", order: 3 },
      { id: "daegu-seo", name: "서구", order: 4 },
      { id: "daegu-suseong", name: "수성구", order: 5 },
      { id: "daegu-dalseo", name: "달서구", order: 6 },
      { id: "daegu-dalseong", name: "달성군", order: 7 }
    ],
    seoul: [
      { id: "seoul-gangnam", name: "강남구", order: 1 },
      { id: "seoul-gangdong", name: "강동구", order: 2 },
      { id: "seoul-gangbuk", name: "강북구", order: 3 },
      { id: "seoul-gangseo", name: "강서구", order: 4 },
      { id: "seoul-gwanak", name: "관악구", order: 5 },
      { id: "seoul-gwangjin", name: "광진구", order: 6 },
      { id: "seoul-guro", name: "구로구", order: 7 },
      { id: "seoul-geumcheon", name: "금천구", order: 8 }
    ],
    gyeonggi: [
      { id: "gyeonggi-suwon", name: "수원시", order: 1 },
      { id: "gyeonggi-seongnam", name: "성남시", order: 2 },
      { id: "gyeonggi-yongin", name: "용인시", order: 3 },
      { id: "gyeonggi-anyang", name: "안양시", order: 4 },
      { id: "gyeonggi-ansan", name: "안산시", order: 5 },
      { id: "gyeonggi-goyang", name: "고양시", order: 6 }
    ],
    busan: [
      { id: "busan-haeundae", name: "해운대구", order: 1 },
      { id: "busan-busanjin", name: "부산진구", order: 2 },
      { id: "busan-dong", name: "동구", order: 3 },
      { id: "busan-nam", name: "남구", order: 4 },
      { id: "busan-buk", name: "북구", order: 5 },
      { id: "busan-sasang", name: "사상구", order: 6 }
    ]
  });

  const currentSubRegions = regionData[selectedRegion] || [];

  const moveSubRegion = (index: number, direction: "up" | "down") => {
    const newSubRegions = [...currentSubRegions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newSubRegions.length) return;

    // Swap items
    [newSubRegions[index], newSubRegions[targetIndex]] = [newSubRegions[targetIndex], newSubRegions[index]];

    // Update order numbers
    newSubRegions.forEach((item, idx) => {
      item.order = idx + 1;
    });

    setRegionData(prev => ({
      ...prev,
      [selectedRegion]: newSubRegions
    }));
  };

  const saveOrder = () => {
    console.log("Saving order for", selectedRegion, ":", currentSubRegions);
    // TODO: Implement API call to save order
    alert(`${topLevelRegions.find(r => r.id === selectedRegion)?.name} 하위 지역 순서가 저장되었습니다.`);
  };

  return (
    <Layout>
      <div className="space-y-6 korean-text bg-gray-50 min-h-screen p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">지역설정</h1>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-x-6">
          {/* Left Panel - Fixed Top-Level Regions */}
          <Card className="bg-white rounded shadow w-32">
            <CardContent className="p-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">상위 지역</h3>
              <div className="flex flex-col space-y-1">
                {topLevelRegions.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => setSelectedRegion(region.id)}
                    className={cn(
                      "text-left px-3 py-2 rounded text-sm transition-colors",
                      selectedRegion === region.id
                        ? "bg-blue-100 font-semibold text-blue-800"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {region.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Right Panel - Sub-Region List */}
          <Card className="bg-white rounded shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  하위 목록 - {topLevelRegions.find(r => r.id === selectedRegion)?.name}
                </h3>
                <Button 
                  onClick={saveOrder}
                  className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  순서 저장
                </Button>
              </div>

              <div className="space-y-2">
                {currentSubRegions.map((subRegion, index) => (
                  <div 
                    key={subRegion.id}
                    className="flex items-center justify-between bg-gray-50 border rounded p-3 text-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">
                        {subRegion.order}
                      </span>
                      <span className="font-medium text-gray-900">{subRegion.name}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveSubRegion(index, "up")}
                        disabled={index === 0}
                        className="p-1 h-8 w-8"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveSubRegion(index, "down")}
                        disabled={index === currentSubRegions.length - 1}
                        className="p-1 h-8 w-8"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {currentSubRegions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  선택된 지역에 하위 지역이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}