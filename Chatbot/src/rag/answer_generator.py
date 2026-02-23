"""Answer generation using summarization and formatting"""
import re
from typing import List

class AnswerGenerator:
    """Generate clean, concise answers from retrieved chunks"""
    
    def __init__(self):
        """Initialize the answer generator"""
        pass
    
    def clean_text(self, text: str) -> str:
        """Clean retrieved text by removing citations, URLs, and formatting"""
        # Remove citations like [1], [2], [1,2,3]
        text = re.sub(r'\[[\d,\s]+\]', '', text)
        text = re.sub(r'\[\d+\]', '', text)
        
        # Remove URLs
        text = re.sub(r'http[s]?://\S+', '', text)
        text = re.sub(r'\[online\]\s*Available\s*:\s*\S+', '', text, flags=re.IGNORECASE)
        text = re.sub(r'Available\s*:\s*\S+', '', text, flags=re.IGNORECASE)
        
        # Remove file references
        text = re.sub(r'[\w\-]+\.pdf\s*\[\d+\]', '', text)
        text = re.sub(r'\[online\]', '', text, flags=re.IGNORECASE)
        
        # Remove page references
        text = re.sub(r'Page\s+\d+\s+of\s+\d+', '', text)
        
        # Clean up multiple spaces and newlines
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def extract_key_information(self, query: str, documents: List[str]) -> str:
        """Extract key information relevant to the query"""
        query_lower = query.lower()
        
        # Clean all documents first
        cleaned_docs = [self.clean_text(doc) for doc in documents]
        
        # Combine and split into sentences
        combined_text = ' '.join(cleaned_docs)
        sentences = re.split(r'[.!?]+', combined_text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
        
        if not sentences:
            return combined_text
        
        # Extract query keywords (remove common words)
        stop_words = {'what', 'is', 'are', 'the', 'a', 'an', 'how', 'why', 'when', 'where', 'which', 'who', 'tell', 'me', 'about'}
        query_words = set(query_lower.split()) - stop_words
        
        # Score sentences based on relevance
        scored_sentences = []
        for sentence in sentences:
            sentence_lower = sentence.lower()
            
            # Count keyword matches
            matches = sum(1 for word in query_words if word in sentence_lower)
            
            # Prioritize sentences with numbers (for costs, specs)
            has_numbers = bool(re.search(r'\d+', sentence))
            
            # Prioritize sentences with key terms
            has_key_terms = any(term in sentence_lower for term in ['benefit', 'cost', 'price', 'advantage', 'save', 'efficient'])
            
            # Calculate score
            score = matches * 2
            if has_numbers:
                score += 1
            if has_key_terms:
                score += 1
            
            if score > 0:
                scored_sentences.append((score, sentence))
        
        if not scored_sentences:
            # Return first few sentences if no good matches
            return '. '.join(sentences[:3]) + '.'
        
        # Sort by score and take top sentences
        scored_sentences.sort(reverse=True, key=lambda x: x[0])
        top_sentences = [s[1] for s in scored_sentences[:5]]
        
        # Maintain original order
        result = []
        for sentence in sentences:
            if sentence in top_sentences:
                result.append(sentence)
        
        return '. '.join(result) + '.'
    
    def format_answer(self, answer: str, query: str) -> str:
        """Format the answer nicely with structure"""
        query_lower = query.lower()
        
        # For "what is" questions, keep it concise
        if any(phrase in query_lower for phrase in ['what is', 'what are', 'define']):
            # Take first 2-3 sentences
            sentences = re.split(r'[.!?]+', answer)
            sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
            return '. '.join(sentences[:2]) + '.'
        
        # For "how much" or cost questions, emphasize numbers
        if any(phrase in query_lower for phrase in ['how much', 'cost', 'price']):
            return answer
        
        # For benefit/advantage questions, structure as list if possible
        if any(phrase in query_lower for phrase in ['benefit', 'advantage', 'why']):
            # Try to detect list items
            if any(marker in answer for marker in ['•', '-', '1.', '2.', 'First', 'Second']):
                return answer
            
            # Split into points if answer is long
            sentences = re.split(r'[.!?]+', answer)
            sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
            
            if len(sentences) > 3:
                # Format as numbered list
                formatted = []
                for i, sentence in enumerate(sentences[:5], 1):
                    formatted.append(f"{i}. {sentence}")
                return '\n'.join(formatted)
        
        return answer
    
    def generate_answer(self, query: str, documents: List[str]) -> str:
        """
        Generate a clean, concise answer from retrieved documents
        
        Args:
            query: User's question
            documents: List of retrieved document chunks
            
        Returns:
            Clean, formatted answer
        """
        if not documents:
            return "I don't have enough information to answer that question."
        
        # Extract key information
        answer = self.extract_key_information(query, documents)
        
        # Remove any remaining artifacts
        answer = self.clean_text(answer)
        
        # Format nicely
        answer = self.format_answer(answer, query)
        
        # Ensure answer is not too long (max 500 words)
        words = answer.split()
        if len(words) > 500:
            answer = ' '.join(words[:500]) + '...'
        
        return answer