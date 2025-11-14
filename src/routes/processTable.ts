import { parse } from "date-fns";

export type HoursPerWeek = number | [number, number]

export interface TableRecord {
    id: string
    title: string
    date: Date
    workStudy: boolean | 'E'
    onCampus: boolean
    hiringPeriod: string
    hoursPerWeek: HoursPerWeek
}

function processRowCells(rowTexts: HTMLCollectionOf<HTMLTableCellElement>): TableRecord {
    let title = rowTexts[2].innerText
    let hiringPeriod = rowTexts[5].innerText
    
    let id = rowTexts[0].firstChild?.textContent
    if (!id) throw new DOMException();

    let dateStr = rowTexts[1].innerText
    let date = parse(dateStr, 'MM\/dd\/yyyy', new Date())

    let workStudyStr = rowTexts[3].innerText
    let workStudy: boolean | 'E' =  workStudyStr[0] === 'E' ? 'E' : workStudyStr[0] === 'W'

    let onCampusStr = rowTexts[4].innerText
    let onCampus = onCampusStr[1] === 'n'

    let hoursPerWeek: HoursPerWeek
    let hoursStr = rowTexts[6].innerText

    if (hoursStr.includes('-')) {
        let splitStr = hoursStr.split('-')
        hoursPerWeek = [Number.parseInt(splitStr[0]), Number.parseInt(splitStr[1])]
    } else 
        hoursPerWeek = Number.parseInt(hoursStr)

    return {
        id,
        title,
        date,
        workStudy,
        onCampus,
        hiringPeriod,
        hoursPerWeek
    }
}

export function processTable(doc: Document): Array<TableRecord> {
    let rows = Array.from(doc.querySelectorAll('tr'));
    rows = rows.slice(1)

    let tableRecords: Array<TableRecord> = [];

    for (let row of rows) {
        let rowCells = row.children as HTMLCollectionOf<HTMLTableCellElement>;

        let record = processRowCells(rowCells);
        tableRecords.push(record)
    }

    return tableRecords;
}

