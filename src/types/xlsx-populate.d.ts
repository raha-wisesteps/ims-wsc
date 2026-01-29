declare module 'xlsx-populate' {
    interface Cell {
        value(): any;
        value(val: any): Cell;
    }

    interface Row {
        cell(columnNumber: number): Cell;
    }

    interface Sheet {
        name(): string;
        cell(address: string): Cell;
        row(rowNumber: number): Row;
    }

    interface Workbook {
        sheets(): Sheet[];
        sheet(name: string): Sheet | undefined;
        outputAsync(): Promise<Buffer>;
    }

    function fromFileAsync(filePath: string): Promise<Workbook>;

    export default {
        fromFileAsync
    };
}
