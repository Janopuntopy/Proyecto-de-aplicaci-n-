import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

# Importar la lógica que ya construimos en magic_bot.py
from magic_bot import download_rules, setup_vectorstore

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

app = FastAPI(
    title="Magic Judge API",
    description="API del Juez de Magic para interactuar desde n8n o Frontends.",
    version="1.0.0"
)

# Variable global para guardar la cadena RAG y no re-instanciarla en cada petición
rag_chain = None

class QuestionRequest(BaseModel):
    question: str

class AnswerResponse(BaseModel):
    answer: str

@app.on_event("startup")
async def startup_event():
    """Se ejecuta una vez cuando arranca el servidor. Configura el RAG."""
    global rag_chain
    print("Inicializando la API del Juez de Magic...")
    
    if not os.getenv("GOOGLE_API_KEY"):
        print("ADVERTENCIA: No se encontró GOOGLE_API_KEY en el entorno.")
        
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
    print("¡API lista para recibir preguntas!")

@app.post("/ask", response_model=AnswerResponse)
async def ask_judge(req: QuestionRequest):
    """Endpoint principal para recibir una pregunta y devolver la respuesta del reglamento."""
    if not rag_chain:
        raise HTTPException(status_code=500, detail="El modelo no se inicializó correctamente.")
        
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía.")
        
    try:
        response_text = rag_chain.invoke({"input": req.question})
        return AnswerResponse(answer=response_text)
    except Exception as e:
        print(f"Error interno al invocar el modelo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Endpoint para revisar si la API está viva (útil para Cloud Run)."""
    return {"status": "ok"}

# Para correr localmente para pruebas: uvicorn api:app --reload
