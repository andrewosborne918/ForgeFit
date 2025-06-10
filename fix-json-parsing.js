// Simple JSON parsing fix
const simplifiedParsingCode = `
      const data = await res.json()
      let raw = data?.text || ""
      
      // Simple cleaning - just remove markdown code blocks if present
      raw = raw.trim();
      
      // Remove markdown code blocks
      if (raw.startsWith('```json')) {
        raw = raw.replace(/^```json\\s*/, '');
      }
      if (raw.startsWith('```')) {
        raw = raw.replace(/^```\\s*/, '');
      }
      if (raw.endsWith('```')) {
        raw = raw.replace(/\\s*```$/, '');
      }
      
      raw = raw.trim();
      
      console.log("Raw JSON from AI:", raw);

      try {
        const json = JSON.parse(raw);
`;

console.log(simplifiedParsingCode);
