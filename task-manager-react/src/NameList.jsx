function NameList() {
    const names = ["Rathna", "Priya", "Anu", "Kavi"];

    return (
        <ul>
            {names.map((name) => (
                <li key={name}>{name}</li>
            ))}
        </ul>
    );
}

export default NameList;