// components/common/IBSheet/SheetEvent.ts (또는 common/sheetEvents.ts)
export const bindCommonEvents = (sheet: any) => {
  let mute  = false;
  const onAfterChange = (evt: any) => {
     if (mute) return;

    const { row, col } = evt;
    if (!row || col === 'select') return; // select 자체 변경엔 개입 X

    const already = sheet.getValue(row, 'select');
    if (already !== 1) {
      mute = true;                   // 🔇 재진입 가드
      sheet.setValue(row, 'select', 1); // 또는 sheet.updateRow(row, { select: 1 })
      mute = false;
    }
  };

  sheet.bind('onAfterChange', onAfterChange);

  return () => {
    sheet.unbind?.('onAfterChange', onAfterChange);
  };
};
