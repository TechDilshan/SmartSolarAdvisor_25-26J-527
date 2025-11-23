from langchain.text_splitter import RecursiveCharacterTextSplitter
from typing import List, Dict
import json
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TextChunker:
    """Split documents into chunks for embedding"""
    
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        # Initialize text splitter with smart separators
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=[
                "\n\n",  # Paragraph breaks
                "\n",    # Line breaks
                ".",     # Sentences
                "!",     # Sentences
                "?",     # Sentences
                ";",     # Clauses
                ",",     # Phrases
                " ",     # Words
                ""       # Characters
            ]
        )
    
    def chunk_documents(self, documents: List[Dict]) -> List[Dict]:
        """
        Split all documents into chunks
        
        Args:
            documents: List of dicts with 'text' and 'metadata' keys
            
        Returns:
            List of chunks with metadata
        """
        all_chunks = []
        chunk_id = 0
        
        logger.info(f"Starting to chunk {len(documents)} documents...")
        
        for doc_idx, document in enumerate(documents):
            text = document["text"]
            metadata = document["metadata"]
            
            # Split text into chunks
            text_chunks = self.text_splitter.split_text(text)
            
            # Create chunk objects with metadata
            for chunk_idx, chunk_text in enumerate(text_chunks):
                chunk = {
                    "chunk_id": f"chunk_{chunk_id}",
                    "text": chunk_text,
                    "metadata": {
                        **metadata,  # Include all original metadata
                        "chunk_index": chunk_idx,
                        "total_chunks_in_doc": len(text_chunks),
                        "doc_index": doc_idx,
                        "char_count": len(chunk_text)
                    }
                }
                
                all_chunks.append(chunk)
                chunk_id += 1
            
            if (doc_idx + 1) % 10 == 0:
                logger.info(f"Chunked {doc_idx + 1}/{len(documents)} documents...")
        
        logger.info(f"✓ Created {len(all_chunks)} chunks from {len(documents)} documents")
        
        return all_chunks
    
    def save_chunks(self, chunks: List[Dict], output_dir: Path):
        """Save chunks to JSON file"""
        output_dir.mkdir(parents=True, exist_ok=True)
        output_file = output_dir / "text_chunks.json"
        
        # Create summary
        summary = {
            "total_chunks": len(chunks),
            "chunk_size": self.chunk_size,
            "chunk_overlap": self.chunk_overlap,
            "chunks": chunks
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✓ Saved chunks to {output_file}")
        
        return output_file
    
    def get_chunking_stats(self, chunks: List[Dict]) -> Dict:
        """Get statistics about chunks"""
        if not chunks:
            return {}
        
        char_counts = [chunk["metadata"]["char_count"] for chunk in chunks]
        
        stats = {
            "total_chunks": len(chunks),
            "avg_chunk_size": sum(char_counts) / len(char_counts),
            "min_chunk_size": min(char_counts),
            "max_chunk_size": max(char_counts),
            "total_characters": sum(char_counts)
        }
        
        return stats