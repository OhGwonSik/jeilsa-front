import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Props = {
  page: number;
  pages: number;
  total: number;
  size: number;
  sizes?: number[];
  isLoading?: boolean;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setSize: React.Dispatch<React.SetStateAction<number>>;
};

export default function Pagination({
  page,
  pages,
  total,
  size,
  sizes = [10, 20, 50, 100],
  isLoading,
  setPage,
  setSize,
}: Props) {
  const canPrev = page > 1;
  const canNext = page < pages && pages > 0;
  const maxPages = Math.max(pages, 1);

  // 페이지 번호 버튼 생성 로직
  const getPageNumbers = () => {
    const pageNumbers: (number | 'ellipsis')[] = [];
    const showEllipsis = pages > 7;
    
    if (!showEllipsis) {
      // 7페이지 이하면 모든 페이지 표시
      for (let i = 1; i <= pages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // 7페이지 초과시 스마트 페이징
      if (page <= 4) {
        // 현재 페이지가 앞쪽에 있을 때
        for (let i = 1; i <= 5; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('ellipsis');
        pageNumbers.push(pages);
      } else if (page >= pages - 3) {
        // 현재 페이지가 뒤쪽에 있을 때
        pageNumbers.push(1);
        pageNumbers.push('ellipsis');
        for (let i = pages - 4; i <= pages; i++) {
          pageNumbers.push(i);
        }
      } else {
        // 현재 페이지가 중간에 있을 때
        pageNumbers.push(1);
        pageNumbers.push('ellipsis');
        for (let i = page - 1; i <= page + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('ellipsis');
        pageNumbers.push(pages);
      }
    }
    
    return pageNumbers;
  };

  return (
    <div className="flex items-center justify-between px-2 py-4">
      {/* 왼쪽: 총 건수 정보 */}
      <div className="text-sm text-muted-foreground">
        총 <span className="font-medium text-foreground">{total.toLocaleString()}</span>건 · 
        <span className="font-medium text-foreground">{page}</span>/<span className="font-medium text-foreground">{maxPages}</span> 페이지
      </div>

      {/* 가운데: 페이지 네비게이션 */}
      <div className="flex items-center space-x-2">
        {/* 처음으로 */}
        <Button
          variant="ghost"
          size="icon"
          disabled={!canPrev || !!isLoading}
          onClick={() => setPage(1)}
          className="h-8 w-8"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        
        {/* 이전 */}
        <Button
          variant="ghost"
          size="icon"
          disabled={!canPrev || !!isLoading}
          onClick={() => setPage(p => Math.max(1, p - 1))}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* 페이지 번호들 */}
        {pages > 0 && getPageNumbers().map((pageNum, index) => {
          if (pageNum === 'ellipsis') {
            return (
              <div key={`ellipsis-${index}`} className="flex h-8 w-8 items-center justify-center">
                <span className="text-muted-foreground">...</span>
              </div>
            );
          }
          
          return (
            <Button
              key={pageNum}
              variant={pageNum === page ? "default" : "ghost"}
              size="icon"
              disabled={!!isLoading}
              onClick={() => setPage(pageNum)}
              className={cn(
                "h-8 w-8",
                pageNum === page && "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              {pageNum}
            </Button>
          );
        })}

        {/* 다음 */}
        <Button
          variant="ghost"
          size="icon"
          disabled={!canNext || !!isLoading}
          onClick={() => setPage(p => Math.min(pages, p + 1))}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {/* 마지막으로 */}
        <Button
          variant="ghost"
          size="icon"
          disabled={!canNext || !!isLoading}
          onClick={() => setPage(pages)}
          className="h-8 w-8"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 오른쪽: 페이지 크기 선택 */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">페이지당</span>
        <Select
          value={size.toString()}
          disabled={!!isLoading}
          onValueChange={(value) => {
            const next = parseInt(value, 10);
            setPage(1);
            setSize(next);
          }}
        >
          <SelectTrigger className="h-8 w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizes.map(s => (
              <SelectItem key={s} value={s.toString()}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">개</span>
      </div>
    </div>
  );
}
