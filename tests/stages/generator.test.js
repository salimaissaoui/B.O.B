import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { generateBlueprint } from '../../src/stages/2-generator.js';
import { GeminiClient } from '../../src/llm/gemini-client.js';

// Mock dependencies
jest.mock('../../src/llm/gemini-client.js');
global.fetch = jest.fn();

describe.skip('Generator Stage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        GeminiClient.mockClear();
    });

    test('should extract image URL and fetch it', async () => {
        const mockGenerateContent = jest.fn().mockResolvedValue({
            steps: [{ op: "site_prep" }], size: { width: 10, height: 10, depth: 10 }, palette: {}
        });

        // Setup mock instance
        GeminiClient.mockImplementation(() => ({
            generateContent: mockGenerateContent,
            streamContent: jest.fn().mockImplementation(async ({ onProgress }) => {
                throw new Error("Stream failed"); // Force fallback to generateContent
            })
        }));

        // Mock Fetch
        global.fetch.mockResolvedValue({
            ok: true,
            headers: { get: () => 'image/png' },
            arrayBuffer: async () => new ArrayBuffer(8)
        });

        const analysis = {
            userPrompt: "Build this house https://example.com/house.png",
            buildType: "house",
            hints: { materials: {}, dimensions: {} }
        };

        const result = await generateBlueprint(analysis, "fake-key");

        // Verify Fetch called
        expect(global.fetch).toHaveBeenCalledWith("https://example.com/house.png");

        // Verify Gemini received image
        expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
            images: expect.arrayContaining([
                expect.objectContaining({ mimeType: 'image/png' })
            ])
        }));
    });

    test('should handle fetch failure gracefully', async () => {
        const mockGenerateContent = jest.fn().mockResolvedValue({
            steps: [{ op: "site_prep" }], size: { width: 10, height: 10, depth: 10 }, palette: {}
        });

        GeminiClient.mockImplementation(() => ({
            generateContent: mockGenerateContent,
            streamContent: jest.fn().mockRejectedValue(new Error("Stream failed"))
        }));

        global.fetch.mockResolvedValue({ ok: false, statusText: "Not Found" });

        const analysis = {
            userPrompt: "Build this house https://example.com/missing.png",
            buildType: "house",
            hints: { materials: {}, dimensions: {} }
        };

        await generateBlueprint(analysis, "fake-key");

        // Verify generated without image
        expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
            images: []
        }));
    });
});
