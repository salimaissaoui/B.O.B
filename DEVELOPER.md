# Developer Guide

## Quick Start for Development

### Prerequisites
- Node.js v18 or higher
- npm v9 or higher
- A Minecraft server for testing (1.20.1 recommended)
- Google Gemini API key

### Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/salimaissaoui/B.O.B.git
   cd B.O.B
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run Tests**
   ```bash
   npm test
   ```

4. **Start Development**
   ```bash
   npm start
   ```

## Project Structure

```
B.O.B/
├── src/
│   ├── bot/              # Command routing & Mineflayer events
│   ├── builder_v2/       # NEXT-GEN Component Pipeline (Intent -> Plan -> execute)
│   ├── config/           # Schemas, block lists, limits
│   ├── export/           # Schematic & Function export logic
│   ├── generators/       # Procedural generation hooks (V1 legacy)
│   ├── llm/              # Gemini Client & Prompts
│   ├── memory/           # Feedback & pattern learning
│   ├── operations/       # V1 Building Primitives (fill, wall, noise)
│   ├── positioning/      # Smart start-pos calculation & pathfinding
│   ├── services/         # Schematic Loader & Gallery
│   ├── stages/           # V1 Pipeline (Analyzer -> Generator -> Validator -> Builder)
│   ├── state/            # Persistence (crashes, resume)
│   ├── utils/            # Shared helpers (Math, Network, Sanitizers)
│   ├── validation/       # Physical world consistency rules
│   ├── worldedit/        # ACK parsers & Circuit Breakers
│   └── index.js          # Main entry point
├── tests/
│   ├── builder_v2/       # V2 pipeline tests
│   ├── integration/      # End-to-end flows
│   ├── operations/       # Individual op logic
│   ├── stages/           # V1 stage contracts
│   └── validation/       # Profile enforcement
└── README.md
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npm test tests/operations/fill.test.js
npm test tests/schemas/validator.test.js
```

### Test Coverage
```bash
npm test -- --coverage
```

## Adding New Features

### Adding a New Operation

1. Create operation file in `src/operations/`:
   ```javascript
   // src/operations/my-operation.js
   export function myOperation(step) {
     const { from, to, block } = step;
     // Generate block placements
     return blocks;
   }
   ```

2. Add to operation map in `src/stages/5-builder.js`:
   ```javascript
   const OPERATION_MAP = {
     // ...
     my_operation: myOperation
   };
   ```

3. Update blueprint schema in `src/config/schemas.js`:
   ```javascript
   op: {
     type: "string",
     enum: [..., "my_operation"]
   }
   ```

4. Add tests in `tests/operations/my-operation.test.js`

### Adding New Block Categories

Edit `src/config/blocks.js`:
```javascript
export const BLOCK_CATEGORIES = {
  // ...
  my_category: [
    'new_block_1',
    'new_block_2'
  ]
};
```

## Debugging

### Enable Verbose Logging
Modify stages to add more console.log statements:
```javascript
console.log('Debug:', JSON.stringify(data, null, 2));
```

### Test Without Minecraft Server
Use mock bot for testing:
```javascript
const mockBot = {
  blockAt: () => null,
  vec3: (x, y, z) => ({ x, y, z })
};
```

### Test LLM Integration
Set up .env with Gemini API key and test individual stages:
```javascript
import { generateDesignPlan } from './src/stages/1-design-planner.js';

const plan = await generateDesignPlan('small house', process.env.GEMINI_API_KEY);
console.log(plan);
```

## Common Tasks

### Adding a New Test
```javascript
// tests/operations/new-test.test.js
import { myOperation } from '../../src/operations/my-operation.js';

describe('My Operation', () => {
  test('should do something', () => {
    const result = myOperation({...});
    expect(result).toBe(...);
  });
});
```

### Updating Schemas
1. Edit `src/config/schemas.js`
2. Run tests to ensure compatibility
3. Update LLM prompts if needed

### Modifying Safety Limits
Edit `src/config/limits.js`:
```javascript
export const SAFETY_LIMITS = {
  maxBlocks: 10000,  // Adjust as needed
  maxUniqueBlocks: 15,
  // ...
};
```

## Code Style

- Use ES6 modules (import/export)
- Use async/await for asynchronous code
- Add JSDoc comments for public functions
- Follow existing naming conventions
- Keep functions small and focused

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run `npm test` to ensure all tests pass
6. Submit a pull request

## Troubleshooting

### Tests Failing
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

### Module Not Found Errors
Ensure you're using Node.js v18+ with ES modules support.

### Gemini API Errors
- Check your API key is valid
- Verify API quota/limits
- Check internet connectivity

## Resources

- [Mineflayer Documentation](https://github.com/PrismarineJS/mineflayer)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [AJV JSON Schema](https://ajv.js.org/)
- [Jest Testing Framework](https://jestjs.io/)
