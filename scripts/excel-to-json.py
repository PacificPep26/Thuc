"""Exports the two sheets used by import-contracts.ts to JSON (strings trimmed, dates as YYYY-MM-DD).

Usage: python scripts/excel-to-json.py "SAL-CRM-2026_Quản lí hợp đồng 2026.xlsx" out.json
"""
import datetime
import json
import sys

import openpyxl


def clean(value):
    if value is None:
        return None
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.strftime('%Y-%m-%d')
    text = str(value).strip()
    return text or None


def sheet(wb, name):
    rows = list(wb[name].iter_rows(values_only=True))
    return [[clean(c) for c in row] for row in rows[1:] if any(c not in (None, '') for c in row)]


def main():
    source, target = sys.argv[1], sys.argv[2]
    wb = openpyxl.load_workbook(source, data_only=True)
    data = {'contracts': sheet(wb, 'Quản lí hợp đồng'), 'processing': sheet(wb, 'Xử lý hồ sơ (New)')}
    with open(target, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    print(f"contracts={len(data['contracts'])} processing={len(data['processing'])}")


main()
