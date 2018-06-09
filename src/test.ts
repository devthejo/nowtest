import invoke from './invoke';
import { ITest } from './interfaces';
import TNode from './test';
import invoke from './invoke';

class TTest extends TNode implements ITest  {
    constructor(
        context: IContext,
        parent: IGroup,
        name: string,
        cb: invoke.Callback,
        expect?: any = invoke.Any
    ) {
        super(context, parent, name);
    }
}

export default TTest;
