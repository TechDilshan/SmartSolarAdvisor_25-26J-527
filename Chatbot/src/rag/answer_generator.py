"""Generate natural conversational answers from retrieved context"""
import re
from typing import List, Dict

class AnswerGenerator:
    """Generate conversational answers from retrieved chunks"""
    
    def __init__(self):
        pass
    
    def _clean_text(self, text: str) -> str:
        """Clean text removing citations and references"""
        # Remove citations like [1], [2], [1,2,3]
        text = re.sub(r'\[[\d,\s]+\]', '', text)
        text = re.sub(r'\[\d+\]', '', text)
        
        # Remove URLs
        text = re.sub(r'http[s]?://\S+', '', text)
        text = re.sub(r'www\.\S+', '', text)
        
        # Remove "Available :" patterns
        text = re.sub(r'\[?online\]?\s*Available\s*:\s*', '', text, flags=re.IGNORECASE)
        text = re.sub(r'loads/[\w\-/]+', '', text)
        text = re.sub(r'downloads/[\w\-/]+', '', text)
        
        # Remove file references
        text = re.sub(r'[\w\-]+\.pdf\s*', '', text)
        text = re.sub(r'\.pdf\s*\[\d+\]', '', text)
        
        # Remove author citations with special characters
        text = re.sub(r'[A-Z][a-z]+\s+[A-Z][a-z]+\s+and\s+[A-Z][a-z]+.*?―.*?‖', '', text)
        text = re.sub(r'―.*?‖', '', text)
        
        # Remove "Annual Report" citations
        text = re.sub(r'Annual Report \d+,\s*Central Bank of Sri Lanka', '', text)
        
        # Remove "The Environmental..." title pattern
        text = re.sub(r'The Environmental and Public Health Benefits of Achieving.*?United States', '', text)
        
        # Remove partial URLs and paths
        text = re.sub(r'l-and-public\s*-health\s*-benefits\s*-achieving\s*-high-penetration\s*-\s*solar', '', text)
        text = re.sub(r'-paper/\d+/\d+\s*-[A-Z]\s*-\s*\d+', '', text)
        
        # Clean whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        text = re.sub(r'\s*-\s*', ' ', text)
        
        return text
    
    def extract_key_points(self, text: str, query: str) -> List[str]:
        """Extract key points from text relevant to the query"""
        # Clean the text first
        text = self._clean_text(text)
        
        # If text is too short or just references, skip it
        if len(text) < 30:
            return []
        
        # Split into sentences
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 30]
        
        # Score sentences based on query relevance
        query_words = set(query.lower().split())
        scored_sentences = []
        
        for sentence in sentences:
            # Skip if sentence is just references or numbers
            if re.match(r'^[\d\s\[\],]+$', sentence):
                continue
            
            sentence_words = set(sentence.lower().split())
            overlap = len(query_words & sentence_words)
            
            if overlap > 0:
                scored_sentences.append((overlap, sentence))
        
        # Sort by relevance and return top sentences
        scored_sentences.sort(reverse=True, key=lambda x: x[0])
        return [s[1] for s in scored_sentences[:5]]
    
    def generate_answer(self, query: str, chunks: List[str]) -> str:
        """Generate a natural conversational answer"""
        query_lower = query.lower()
        
        # Extract and clean key points from all chunks
        all_points = []
        for chunk in chunks[:5]:  # Use top 5 chunks
            points = self.extract_key_points(chunk, query)
            all_points.extend(points)
        
        # Remove duplicates and very similar sentences
        unique_points = []
        seen = set()
        
        for point in all_points:
            # Create fingerprint (first 60 characters)
            key = point[:60].lower().strip()
            
            # Skip if empty or already seen
            if not key or key in seen:
                continue
            
            # Skip if it's just a reference or citation
            if len(point) < 40:
                continue
            
            seen.add(key)
            unique_points.append(point.strip())
        
        if not unique_points:
            return "I don't have enough specific information to answer that question clearly. Please try rephrasing your question."
        
        # Generate conversational answer based on topic
        if any(word in query_lower for word in ['benefit', 'advantage', 'why', 'ප්‍රතිලාභ']):
            answer = "**Benefits of Solar Energy:**\n\n"
            for point in unique_points[:6]:
                answer += f"• {point}\n\n"
        
        elif any(word in query_lower for word in ['cost', 'price', 'expensive', 'how much', 'මිල']):
            answer = "**Solar System Costs:**\n\n"
            for point in unique_points[:6]:
                answer += f"• {point}\n\n"
        
        elif any(word in query_lower for word in ['install', 'setup', 'process', 'installation']):
            answer = "**Solar Installation Process:**\n\n"
            for point in unique_points[:6]:
                answer += f"• {point}\n\n"
        
        elif any(word in query_lower for word in ['maintain', 'maintenance', 'care']):
            answer = "**Solar System Maintenance:**\n\n"
            for point in unique_points[:6]:
                answer += f"• {point}\n\n"
        
        elif any(word in query_lower for word in ['net metering', 'metering', 'ceb']):
            answer = "**Net Metering Information:**\n\n"
            for point in unique_points[:6]:
                answer += f"• {point}\n\n"
        
        elif any(word in query_lower for word in ['panel', 'monocrystalline', 'polycrystalline']):
            answer = "**Solar Panel Information:**\n\n"
            for point in unique_points[:6]:
                answer += f"• {point}\n\n"
        
        else:
            # General answer format - just list the points
            answer = "\n\n".join(unique_points[:5])
        
        return answer.strip()