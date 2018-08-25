import { IResult, IReporter } from "..";

function createReporter(options: createReporter.Options = {}): IReporter {
    const { cssPrefix = "testnow", target = document.body } = options;
    return function (results: IResult) {
        const testsOk = !results.errors.length;
        let outputHTML = `<div class="${cssPrefix}">`;
        outputHTML += `
<style>
.${cssPrefix} {
    border: 2px solid #034;
    background-color: #011;
    color: #def;
}
.${cssPrefix} .testnow-title {
    font-size: 20px;
}
.${cssPrefix} .testnow-title .testnow-passed {
    color: green;
}
.${cssPrefix} .testnow-title .testnow-failed{
    color: red;
}
.${cssPrefix} .testnow-title .testnow-date {
    color: white;
    font-style: italic;
}
.${cssPrefix} li ul {
    display: block;
    margin-left: 20px;
}
.${cssPrefix} li .testnow-title {
    text-decoration: underline;
}
.${cssPrefix} li ul {
    display: block;
    margin-left: 20px;
}
.${cssPrefix} .testnow-error {
    whitespace: pre;
    color: red;
    font-weight: bold;
    border: 1px solid red;
    margin: 1px;
}

</style>
`;
        outputHTML += `<hr />`;
        outputHTML += `<div class="testnow-title"> ${results.name} ${testsOk ? `<span class="testnow-passed">PASSED` : `<span class="testnow-failed">FAILED`} </span > <span class="testnow-date">${results.date}</span></div>\n`;
        outputHTML += `<ul>`;
        results.traverse({
            test(result) {
                outputHTML += `<li class="testnow-node testnow-test"> <span class="testnow-title">${result.name}</span> <span class="testnow-result testnow-${result.passed ? `passed">PASSED` : `failed">FAILED`} </span> <span class="testnow-elapsed"> ${result.elapsed} ms</span></li>`;
            },
            group(result) {
                outputHTML += `<li class="testnow-node testnow-group"> <span class="testnow-title">${result.name}</span> <span class="testnow-result testnow-${result.passed ? `passed">PASSED` : `failed">FAILED`} </span> <span class="testnow-elapsed"> ${result.elapsed} ms</span><span class="testnow-count">(${result.passedCount}/${result.totalCount})</span>`;
                outputHTML += `<ul>`
            },
            groupEnd() {
                outputHTML += "</ul></li>";
            }
        });
        outputHTML += `</ul>`;
        results.errors.forEach(error => {
            outputHTML += `<div class="testnow-error">${error.stack}</div>`;
        })
        outputHTML += `</div>`;
        target.innerHTML = outputHTML;

        return testsOk;
    }
}

namespace createReporter {
    export interface Options {
        target?: Element;
        cssPrefix?: string;
    }
}

export default createReporter;
