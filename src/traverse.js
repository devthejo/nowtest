module.exports = function traverse(
    what,
    options
) {
    let { test: cbTest, group: cbGroup, groupEnd: cbGroupEnd, groupsFirst, all: cbAll } = options;
    cbGroup = cbGroup || (() => undefined);
    cbGroupEnd = cbGroupEnd || (() => undefined);
    cbTest = cbTest || (() => undefined);
    cbAll = cbAll || (() => undefined);
    let onTest = (test) => {
        cbAll(test);
        cbTest(test);
    };
    let onGroup = (group) => {
        cbAll(group);
        if (!cbGroup(group)) {
            traverse(group, options);
        }
        cbGroupEnd(group);
    }

    if (groupsFirst) what.groups.forEach(onGroup);
    what.tests.forEach(onTest);
    if (!groupsFirst) what.groups.forEach(onGroup);
}
