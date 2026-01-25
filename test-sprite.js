
import { searchSpriteReference } from './src/services/sprite-reference.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log('Testing Sprite Search...');
    try {
        const url = await searchSpriteReference('charizard');
        console.log('Result URL:', url);
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
