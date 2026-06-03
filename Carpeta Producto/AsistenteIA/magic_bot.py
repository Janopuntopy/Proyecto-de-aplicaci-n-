import os
import requests
from dotenv import load_dotenv
from google import genai  # El SDK oficial y nativo de Google

# Importaciones de estructura de LangChain
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.embeddings import Embeddings

# Cargar variables de entorno (.env)
load_dotenv()

# Configuración de URLs y directorios
RULES_URL = "https://media.wizards.com/2026/downloads/MagicCompRules%2020260417.txt?_gl=1*vmrpza*_gcl_au*MTcxMjI0MDQyNS4xNzc0OTEwNDk4*FPAU*MTcxMjI0MDQyNS4xNzc0OTEwNDk4*_ga*MTEwMDI3Mjc2My4xNzc0OTEwNDk5*_ga_X145Z177LS*czE3ODA0MTc1NTckbzYkZzEkdDE3ODA0MTc1OTEkajI2JGwwJGgxMjEyMTA0NDk3*_fplc*ZjZrUXlJR2FoMllscW50WVJZWlFzNGkxWmpKbkM0Zm01QlFNTDNublFPNjQ1Q1NaNlYlMkJwdmdJMkRrMDl1MnNVYVlIRWglMkY0bnFoMlFyVFVvRXpha3k1QU1IYm9UUXNiNzhpRkRMVnpaUUZOTUtmOWJWc2FpN0MxSVk4NjhOZyUzRCUzRA.."
RULES_FILE = "magic_rules.txt"
CHROMA_DIR = "./chroma_db"

from langchain_huggingface import HuggingFaceEmbeddings

def download_rules():
    """Descarga el reglamento oficial si no existe localmente."""
    if not os.path.exists(RULES_FILE):
        print("Descargando el reglamento de Magic: The Gathering. Por favor espera...")
        try:
            response = requests.get(RULES_URL)
            response.raise_for_status()
            with open(RULES_FILE, "w", encoding="utf-8") as f:
                f.write(response.text)
            print("¡Descarga completada! Archivo guardado como 'magic_rules.txt'.")
        except Exception as e:
            print(f"Error al descargar el archivo: {e}")
            raise
    else:
        print("El archivo 'magic_rules.txt' ya existe. Omitiendo descarga.")


def setup_vectorstore():
    """Procesa el texto y crea la base de datos vectorial Chroma."""
    # Usamos un modelo local potente y 100% gratuito que no tiene límites de API
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    
    if os.path.exists(CHROMA_DIR) and os.listdir(CHROMA_DIR):
        print("Cargando la base de datos vectorial existente desde './chroma_db'...")
        vectorstore = Chroma(persist_directory=CHROMA_DIR, embedding_function=embeddings)
    else:
        print("Vectorizando el reglamento con Gemini y creando la base de datos. Esto tomará unos minutos...")
        
        with open(RULES_FILE, "r", encoding="utf-8") as f:
            text = f.read()
        
        docs = [Document(page_content=text)]
        
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )
        splits = text_splitter.split_documents(docs)
        
        vectorstore = Chroma.from_documents(
            documents=splits, 
            embedding=embeddings, 
            persist_directory=CHROMA_DIR
        )
        print("¡Base de datos vectorial creada y guardada con éxito en './chroma_db'!")
        
    return vectorstore


def main():
    if not os.getenv("GOOGLE_API_KEY"):
        print("Error: No se encontró GOOGLE_API_KEY. Asegúrate de configurar tu archivo .env.")
        return

    download_rules()
    vectorstore = setup_vectorstore()
    
    retriever = vectorstore.as_retriever(search_kwargs={"k": 10})
    llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0)
    
    system_prompt = (
        "Eres un Juez Oficial de Magic: The Gathering. "
        "El contexto proporcionado a continuación contiene extractos del reglamento oficial en inglés. "
        "Relaciona los términos en español de la pregunta del jugador con sus equivalentes en inglés "
        "(ej. arrollar=trample, conjuro=sorcery, instante=instant, mareo de invocación=summoning sickness, etc.). "
        "Responde a la pregunta utilizando la información del contexto y tu amplio conocimiento de las reglas oficiales del juego. "
        "Si la respuesta no se encuentra en el contexto, puedes usar tu conocimiento interno siempre que la respuesta sea 100% "
        "fiel al reglamento oficial actual. Responde SIEMPRE en español de forma fluida, natural y amigable.\n\n"
        "Contexto:\n{context}"
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)
    
    setup_and_retrieval = {
        "context": RunnableLambda(lambda x: x["input"]) | retriever | format_docs,
        "input": RunnableLambda(lambda x: x["input"])
    }
    
    rag_chain = setup_and_retrieval | prompt | llm | StrOutputParser()
    
    print("\n" + "="*50)
    print(" 🧙‍♂️ ¡Bienvenido al Bot Juez de Magic (Powered by Gemini)! 🧙‍♂️ ")
    print("="*50)
    print("Escribe tu pregunta sobre las reglas. Escribe 'salir' o 'exit' para terminar.\n")
    
    while True:
        try:
            user_input = input("Pregunta: ")
        except (KeyboardInterrupt, EOFError):
            print("\nSaliendo... ¡Que tengas buenas partidas!")
            break
            
        if user_input.strip().lower() in ['salir', 'exit']:
            print("Saliendo... ¡Que tengas buenas partidas!")
            break
            
        if not user_input.strip():
            continue
            
        print("Consultando el reglamento...")
        try:
            response_text = rag_chain.invoke({"input": user_input})
            print(f"\nRespuesta del Juez: {response_text}\n")
            print("-" * 50)
        except Exception as e:
            print(f"\nOcurrió un error al consultar el modelo: {e}\n")


if __name__ == "__main__":
    main()