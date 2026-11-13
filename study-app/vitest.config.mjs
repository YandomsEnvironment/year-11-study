import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],test:{environment:'jsdom',include:['test/**/*.test.tsx'],environmentOptions:{jsdom:{pretendToBeVisual:true}},maxWorkers:1}});
