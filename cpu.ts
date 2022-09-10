import fs from "fs";

const file = process.argv[2];

type Node = {
    id: number;
    callFrame: {
        functionName: string;
        scriptId: string;
        url: string;
        lineNumber: number;
        columnNumber: number;
    };
    hitCount: number;
    children: number[];
};

type Data = {
    nodes: Node[];
    samples: number[];
    timeDeltas: number[];
};

const data = JSON.parse(fs.readFileSync(file).toString()) as Data;
// const nodes = data.nodes;
//
const nodes = data.nodes.reduce<{ [key: number]: Node }>((acc, node) => {
    acc[node.id] = node;
    return acc;
}, {});

const node_id = (
    data.nodes.find((n, i) => {
        console.log("n", n.callFrame.functionName, i, process.argv[3], n.id);
        return n.callFrame.functionName === process.argv[3];
    }) as Node
).id;

console.log("node_idx", node_id);

let sum = 0;
let start = 0;
for (
    ;
    start < data.samples.length && nodes[data.samples[start]].id !== node_id;
    ++start
) {}
console.log("found start", start);
for (
    let i = start;
    i < data.samples.length && data.samples[i] === node_id;
    ++i
) {
    sum += data.timeDeltas[i + 1];
}

console.log("node", data.nodes[node_id]);
console.log("samples", data.samples.length, data.timeDeltas.length);
console.log("time deltas", sum);
