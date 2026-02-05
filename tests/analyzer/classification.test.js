import { analyzePrompt } from '../../src/config/build-types.js';
import { getValidationProfile } from '../../src/validation/validation-profiles.js';

describe('Big Ben Classification Drift Regression', () => {
    test('Big Ben should be classified as a tower', () => {
        const analysis = analyzePrompt('Big Ben');
        expect(analysis.type.type).toBe('tower');
    });

    test('Tower build type should map to a profile with high maxHeight', () => {
        // We use the mapping to infrastructure/landmark which we know has high limits
        const profile = getValidationProfile('tower');
        expect(['infrastructure', 'landmark']).toContain(profile.id);

        // Assert maxHeight if it exists in the profile schema (confirmed in discovery)
        if (profile.maxHeight !== undefined) {
            expect(profile.maxHeight).toBeGreaterThanOrEqual(256);
        }
    });
});
