/**
 * Cursor Logic for Relative Positioning
 */
export class BuildCursor {
    constructor(startPos) {
        this.startPos = startPos || { x: 0, y: 0, z: 0 };
        this.pos = { ...this.startPos };
        this.history = [];
    }

    reset() {
        this.pos = { ...this.startPos };
    }

    move(offset) {
        this.pos.x += offset.x || 0;
        this.pos.y += offset.y || 0;
        this.pos.z += offset.z || 0;
        return { ...this.pos };
    }

    set(pos) {
        // If pos is relative components (x,y,z), update absolute
        this.pos = this.resolve(pos);
        return { ...this.pos };
    }

    push() {
        this.history.push({ ...this.pos });
    }

    pop() {
        if (this.history.length > 0) {
            this.pos = this.history.pop();
        }
    }

    // Resolve a coordinate which might be relative or absolute
    // In the new system, we treat coordinates in steps as relative to startPos 
    // UNLESS they are explicitly "cursor relative" (which we might handle via specific operations)
    // For compatibility: Input {x,y,z} is usually relative to startPos.
    resolve(relPos) {
        return {
            x: this.startPos.x + (relPos.x || 0),
            y: this.startPos.y + (relPos.y || 0),
            z: this.startPos.z + (relPos.z || 0)
        };
    }
}
