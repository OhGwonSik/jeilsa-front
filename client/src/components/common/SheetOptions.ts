// common/sheetOptions.ts
export const baseSheetOptions = {
  Cfg: {
    Style: "IBSP",
    SearchMode: 0,
    Page: 20,
    AutoFitColWidth: 'init',
    FitWidth: true,
    CanSort: false, //정렬 false
    RequiredPosition: "Right" ,//필수갑 표시,
  },
  Def: {
    Row: {  Align: 'Center' ,CanSort : false},
  },
};

export const commonColumns = [
  { Type: 'Int', Name: 'SEQ', Align: 'Center', Width: 50, Render: 0, CanEdit: 0 },
   { Header: { Value: '', HeaderCheck: 1, Align: 'Center' }, Type: 'Bool', Name: 'select', Width: 60 },
];

export const commonSystemFields = [
  { Header: '생성일', Name: 'regDt', Type: 'Date', Align: 'Center', Width: 100, Format: 'yyyy-MM-dd', CanEdit: 0 },
  { Header: '생성자', Name: 'regId', Type: 'Text', Align: 'Center', Width: 80, CanEdit: 0 },
  { Header: '수정일', Name: 'chgDt', Type: 'Date', Align: 'Center', Width: 100, Format: 'yyyy-MM-dd', CanEdit: 0 },
  { Header: '수정자', Name: 'chgId', Type: 'Text', Align: 'Center', Width: 80, CanEdit: 0 },
  { Header: '삭제일', Name: 'delDt', Type: 'Date', Align: 'Center', Width: 100, Format: 'yyyy-MM-dd', CanEdit: 0 },
  { Header: '삭제자', Name: 'delId', Type: 'Text', Align: 'Center', Width: 80, CanEdit: 0 },
];