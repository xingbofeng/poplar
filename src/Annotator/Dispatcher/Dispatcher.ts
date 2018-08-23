import {Label} from "../Store/Entities/Label";
import {Store} from "../Store/Store";
import {Action} from "../Action/Action";
import {Connection} from "../Store/Entities/Connection";

export class Dispatcher {
    constructor(
        private store: Store
    ) {
    }

    dispatch(action: Action.IAction) {
        if (action instanceof Action.Label.CreateLabelAction) {
            this.store.labelRepo.add(new Label.Entity(null, action.categoryId, action.startIndex, action.endIndex, this.store));
        } else if (action instanceof Action.Label.DeleteLabelAction) {
            this.store.labelRepo.delete(action.id);
        } else if (action instanceof Action.Connection.CreateConnectionAction) {
            this.store.connectionRepo.add(new Connection.Entity(null, action.categoryId, action.fromId, action.toId, this.store));
        }
    }
}