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

    /**
     * Reconcile cursor position with actual WorldEdit operation result
     * Detects and corrects drift when operations don't affect expected regions
     *
     * @param {Object} expectedEndPos - Expected cursor position after operation
     * @param {Object} operationResult - Result from WorldEdit executor
     * @param {Object} operationResult.success - Whether operation succeeded
     * @param {Object} operationResult.actualBounds - Actual affected region (if available)
     * @param {number} operationResult.blocksChanged - Number of blocks modified
     * @returns {Object} Reconciliation result {corrected, drift, warning}
     */
    reconcile(expectedEndPos, operationResult) {
        const result = {
            corrected: false,
            drift: { x: 0, y: 0, z: 0, magnitude: 0 },
            warning: null
        };

        // If operation failed, don't update cursor position
        if (!operationResult?.success) {
            result.warning = 'Operation failed - cursor position unchanged';
            return result;
        }

        // If we have actual bounds from WorldEdit, check for drift
        if (operationResult.actualBounds) {
            const actual = operationResult.actualBounds;

            // Calculate drift from expected end position
            if (actual.to) {
                const driftX = actual.to.x - expectedEndPos.x;
                const driftY = actual.to.y - expectedEndPos.y;
                const driftZ = actual.to.z - expectedEndPos.z;
                const magnitude = Math.abs(driftX) + Math.abs(driftY) + Math.abs(driftZ);

                if (magnitude > 0) {
                    result.drift = { x: driftX, y: driftY, z: driftZ, magnitude };

                    // Only correct if drift is significant but not extreme
                    // Extreme drift (>10 blocks) likely indicates a different issue
                    if (magnitude > 0 && magnitude <= 10) {
                        console.log(`  \u26A0 Cursor drift detected: ${magnitude} blocks (dx=${driftX}, dy=${driftY}, dz=${driftZ}). Correcting...`);
                        this.pos = { ...actual.to };
                        result.corrected = true;
                    } else if (magnitude > 10) {
                        result.warning = `Large drift detected (${magnitude} blocks) - not auto-correcting. Manual intervention may be needed.`;
                    }
                }
            }
        }

        // If no actual bounds but operation reported 0 blocks changed,
        // the operation may have been a no-op (already filled, out of bounds, etc.)
        if (operationResult.blocksChanged === 0 && !operationResult.actualBounds) {
            result.warning = 'Operation affected 0 blocks - cursor may be in unexpected area';
        }

        return result;
    }

    /**
     * Get the current absolute cursor position
     * @returns {Object} Current position {x, y, z}
     */
    getPosition() {
        return { ...this.pos };
    }

    /**
     * Calculate expected end position after an operation
     * @param {Object} operation - Operation with from/to or offset
     * @returns {Object} Expected end position
     */
    calculateExpectedEnd(operation) {
        if (operation.to) {
            return this.resolve(operation.to);
        }
        if (operation.offset) {
            return {
                x: this.pos.x + (operation.offset.x || 0),
                y: this.pos.y + (operation.offset.y || 0),
                z: this.pos.z + (operation.offset.z || 0)
            };
        }
        return { ...this.pos };
    }
}
